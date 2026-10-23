import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import UserRole, decode_token, hash_password, is_legacy_role_lookup_error, verify_password
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.user import MotherProfile, User
from app.repositories.users import UserRepository
from app.schemas.auth import TokenPair, UserCreate
from app.services.token_service import TokenService
from app.utils.passwords import validate_password_policy


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    async def _generate_unique_id(self, prefix: str) -> str:
        for _ in range(15):
            token = secrets.token_hex(3).upper()
            custom_id = f"{prefix}-{token}"
            existing = await self.db.scalar(select(User).where(User.custom_id == custom_id))
            if not existing:
                return custom_id
        timestamp_part = int(datetime.now(timezone.utc).timestamp()) % 1000000
        return f"{prefix}-{timestamp_part:06d}"

    async def register(self, payload: UserCreate) -> User:
        if payload.role == UserRole.ADMIN:
            raise AppError(
                "Self-registration is not available for this role",
                status.HTTP_403_FORBIDDEN,
            )

        if payload.confirm_password is not None and payload.password != payload.confirm_password:
            raise AppError("Passwords do not match", status.HTTP_400_BAD_REQUEST)

        validate_password_policy(payload.password)

        try:
            existing = await self.users.get_by_email(payload.email)
        except LookupError as exc:
            if not is_legacy_role_lookup_error(exc):
                raise
            raise AppError("Email already registered", status.HTTP_409_CONFLICT) from exc
        if existing:
            raise AppError("Email already registered", status.HTTP_409_CONFLICT)

        user_data = {
            "email": payload.email.lower(),
            "name": payload.name,
            "phone": payload.phone,
            "password_hash": hash_password(payload.password),
            "role": payload.role,
            "preferred_language": payload.preferred_language,
            "age": payload.age,
        }

        if payload.role == UserRole.MOTHER:
            if not payload.doctor_id or not payload.doctor_id.strip():
                raise AppError("Doctor ID is required for mother registration", status.HTTP_400_BAD_REQUEST)

            doc_term = payload.doctor_id.strip()
            doctor_conditions = [
                User.custom_id == doc_term,
                func.upper(User.custom_id) == doc_term.upper(),
                User.email == doc_term.lower(),
            ]
            try:
                doctor_conditions.append(User.id == UUID(doc_term))
            except (ValueError, AttributeError):
                pass

            doctor = await self.db.scalar(
                select(User).where(User.role == UserRole.DOCTOR, or_(*doctor_conditions))
            )
            if not doctor:
                raise AppError("Invalid or non-existent Doctor ID", status.HTTP_400_BAD_REQUEST)
            if not doctor.is_active:
                raise AppError("Doctor account is inactive", status.HTTP_400_BAD_REQUEST)
            if not doctor.is_verified:
                raise AppError("Doctor account is pending verification and cannot accept patients", status.HTTP_400_BAD_REQUEST)

            mother_id = await self._generate_unique_id("MTH")
            user_data["custom_id"] = mother_id
            user_data["assigned_doctor_id"] = doctor.custom_id or str(doctor.id)
            user_data["is_verified"] = True

            user = await self.users.create(**user_data)
            self.db.add(MotherProfile(user_id=user.id, age=payload.age))

            existing_dp = await self.db.scalar(
                select(DoctorPatient).where(
                    DoctorPatient.doctor_id == doctor.id,
                    DoctorPatient.patient_id == user.id,
                    DoctorPatient.status == "active",
                    DoctorPatient.deleted_at.is_(None),
                )
            )
            if not existing_dp:
                self.db.add(DoctorPatient(doctor_id=doctor.id, patient_id=user.id, status="active"))

        elif payload.role == UserRole.DOCTOR:
            if not payload.medical_license or not payload.medical_license.strip():
                raise AppError("Medical license number is required for doctor registration", status.HTTP_400_BAD_REQUEST)

            clean_license = payload.medical_license.strip().upper()
            existing_lic = await self.db.scalar(
                select(User).where(func.upper(User.medical_license) == clean_license)
            )
            if existing_lic:
                raise AppError("Medical license number is already registered", status.HTTP_409_CONFLICT)

            doctor_id = await self._generate_unique_id("DOC")
            user_data["custom_id"] = doctor_id
            user_data["medical_license"] = clean_license
            user_data["is_verified"] = False  # Doctor accounts must undergo verification before access

            user = await self.users.create(**user_data)

        elif payload.role == UserRole.CAREGIVER:
            if not payload.mother_id or not payload.mother_id.strip():
                raise AppError("Mother/Patient ID or invitation code is required for caregiver registration", status.HTTP_400_BAD_REQUEST)

            mth_term = payload.mother_id.strip()
            mother_conditions = [
                User.custom_id == mth_term,
                func.upper(User.custom_id) == mth_term.upper(),
                User.email == mth_term.lower(),
            ]
            try:
                mother_conditions.append(User.id == UUID(mth_term))
            except (ValueError, AttributeError):
                pass

            mother = await self.db.scalar(
                select(User).where(User.role == UserRole.MOTHER, or_(*mother_conditions))
            )
            if not mother:
                raise AppError("Invalid or non-existent Mother/Patient ID", status.HTTP_400_BAD_REQUEST)

            caregiver_id = await self._generate_unique_id("CRG")
            user_data["custom_id"] = caregiver_id
            user_data["assigned_mother_id"] = mother.custom_id or str(mother.id)
            user_data["is_verified"] = True

            user = await self.users.create(**user_data)
            # Create CareCircleAccess in pending status; consent from mother is strictly required
            self.db.add(
                CareCircleAccess(
                    user_id=mother.id,
                    requester_id=user.id,
                    relationship_label="Caregiver",
                    status="pending",
                )
            )
        else:
            user = await self.users.create(**user_data)

        await self.db.commit()
        return user

    async def login(
        self,
        email: str,
        password: str,
        portal: UserRole | None = None,
        doctor_id: str | None = None,
        medical_license: str | None = None,
        mother_id: str | None = None,
    ) -> TokenPair:
        try:
            user = await self.users.get_by_email(email)
        except LookupError as exc:
            if not is_legacy_role_lookup_error(exc):
                raise
            raise AppError("Invalid credentials", status.HTTP_401_UNAUTHORIZED) from exc
        if not user or not verify_password(password, user.password_hash):
            raise AppError("Invalid credentials", status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            raise AppError("User is inactive", status.HTTP_403_FORBIDDEN)
        if portal is not None and user.role != portal:
            raise AppError(
                "This account is not available for the selected portal",
                status.HTTP_403_FORBIDDEN,
            )

        # Role-specific identifier validation
        if user.role == UserRole.MOTHER and (portal == UserRole.MOTHER or doctor_id is not None):
            if not doctor_id or not doctor_id.strip():
                if user.assigned_doctor_id:
                    raise AppError("Doctor ID is required for mother login", status.HTTP_400_BAD_REQUEST)
            else:
                clean_doc_id = doctor_id.strip()
                doc_conditions = [
                    User.custom_id == clean_doc_id,
                    func.upper(User.custom_id) == clean_doc_id.upper(),
                    User.email == clean_doc_id.lower(),
                ]
                try:
                    doc_conditions.append(User.id == UUID(clean_doc_id))
                except (ValueError, AttributeError):
                    pass

                doc = await self.db.scalar(
                    select(User).where(
                        User.role == UserRole.DOCTOR,
                        or_(*doc_conditions),
                    )
                )

                if doc:
                    active_assignment = await self.db.scalar(
                        select(DoctorPatient).where(
                            DoctorPatient.doctor_id == doc.id,
                            DoctorPatient.patient_id == user.id,
                            DoctorPatient.status == "active",
                            DoctorPatient.deleted_at.is_(None),
                        )
                    )
                    if active_assignment:
                        pass  # Active assignment verified
                    else:
                        # Check if doctor had an ended assignment
                        ended = await self.db.scalar(
                            select(DoctorPatient).where(
                                DoctorPatient.doctor_id == doc.id,
                                DoctorPatient.patient_id == user.id,
                                or_(DoctorPatient.status != "active", DoctorPatient.deleted_at.is_not(None)),
                            )
                        )
                        if ended:
                            raise AppError("Doctor assignment is no longer active", status.HTTP_401_UNAUTHORIZED)

                        matches_assigned = user.assigned_doctor_id and (
                            clean_doc_id.upper() == user.assigned_doctor_id.upper() or clean_doc_id == user.assigned_doctor_id
                        )
                        if not matches_assigned:
                            raise AppError("Doctor is not actively assigned to this patient", status.HTTP_401_UNAUTHORIZED)
                else:
                    matches_assigned = user.assigned_doctor_id and (
                        clean_doc_id.upper() == user.assigned_doctor_id.upper() or clean_doc_id == user.assigned_doctor_id
                    )
                    if not matches_assigned:
                        raise AppError("Invalid Doctor ID", status.HTTP_401_UNAUTHORIZED)

        elif user.role == UserRole.DOCTOR and (portal == UserRole.DOCTOR or medical_license is not None):
            if not medical_license or not medical_license.strip():
                if user.medical_license:
                    raise AppError("Medical license number is required for doctor login", status.HTTP_400_BAD_REQUEST)
            else:
                clean_lic = medical_license.strip().upper()
                if not user.medical_license or user.medical_license.strip().upper() != clean_lic:
                    raise AppError("Invalid Medical License Number", status.HTTP_401_UNAUTHORIZED)
            self._ensure_doctor_verified(user)

        elif user.role == UserRole.CAREGIVER and (portal == UserRole.CAREGIVER or mother_id is not None):
            if not mother_id or not mother_id.strip():
                if user.assigned_mother_id:
                    raise AppError("Mother/Patient ID is required for caregiver login", status.HTTP_400_BAD_REQUEST)
            else:
                clean_mth_id = mother_id.strip()
                matches_assigned = user.assigned_mother_id and (
                    clean_mth_id.upper() == user.assigned_mother_id.upper() or clean_mth_id == user.assigned_mother_id
                )
                if not matches_assigned:
                    mth = await self.db.scalar(
                        select(User).where(
                            User.role == UserRole.MOTHER,
                            or_(
                                User.custom_id == clean_mth_id,
                                func.upper(User.custom_id) == clean_mth_id.upper(),
                            ),
                        )
                    )
                    if not mth:
                        raise AppError("Invalid Mother/Patient ID", status.HTTP_401_UNAUTHORIZED)

        self._ensure_doctor_verified(user)
        tokens = await TokenService(self.db).issue_pair(user)
        await self.db.commit()
        return tokens

    @staticmethod
    def _ensure_doctor_verified(user: User) -> None:
        if user.role == UserRole.DOCTOR and not user.is_verified:
            raise AppError(
                "Doctor account pending verification",
                status.HTTP_403_FORBIDDEN,
            )

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            token_service = TokenService(self.db)
            user_id, _ = await token_service.rotate_refresh_token(refresh_token)
        except ValueError as exc:
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED) from exc
        try:
            user = await self.users.get(UUID(user_id))
        except LookupError as exc:
            if not is_legacy_role_lookup_error(exc):
                raise
            raise AppError("User not found", status.HTTP_404_NOT_FOUND) from exc
        if not user or not user.is_active:
            raise AppError("User not found", status.HTTP_404_NOT_FOUND)
        self._ensure_doctor_verified(user)
        tokens = await token_service.issue_pair(user)
        await self.db.commit()
        return tokens

    async def forgot_password(self, email: str) -> None:
        try:
            await self.users.get_by_email(email)
        except LookupError as exc:
            if not is_legacy_role_lookup_error(exc):
                raise
            # Legacy-role row: respond exactly as for an unknown email.
            return

    async def logout(self, refresh_token: str) -> None:
        try:
            await TokenService(self.db).revoke_refresh_token(refresh_token)
            await self.db.commit()
        except ValueError as exc:
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED) from exc

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise AppError("Current password is incorrect", status.HTTP_400_BAD_REQUEST)
        validate_password_policy(new_password)
        user.password_hash = hash_password(new_password)
        await TokenService(self.db).revoke_all_for_user(user.id)
        await self.db.commit()

    async def reset_password(self, token: str, new_password: str) -> None:
        try:
            payload = decode_token(token, "reset")
            subject = UUID(payload["sub"])
        except (ValueError, KeyError) as exc:
            raise AppError("Invalid reset token", status.HTTP_401_UNAUTHORIZED) from exc
        try:
            user = await self.users.get(subject)
        except LookupError as exc:
            if not is_legacy_role_lookup_error(exc):
                raise
            raise AppError("User not found", status.HTTP_404_NOT_FOUND) from exc
        if not user:
            raise AppError("User not found", status.HTTP_404_NOT_FOUND)
        validate_password_policy(new_password)
        user.password_hash = hash_password(new_password)
        await TokenService(self.db).revoke_all_for_user(user.id)
        await self.db.commit()
