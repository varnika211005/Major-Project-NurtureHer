import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthPage } from "./AuthPages";
import { LanguageProvider } from "@/context/LanguageContext";
import type { User } from "@/lib/api";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
  }),
}));

function renderAuthPage(props: { initialMode?: "login" | "register"; adminOnly?: boolean } = {}) {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <AuthPage {...props} />
      </LanguageProvider>
    </BrowserRouter>,
  );
}

describe("AuthPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Dynamic Login Identifiers", () => {
    it("renders Doctor ID field for Mother portal by default", () => {
      renderAuthPage();
      expect(screen.getByLabelText(/doctor id/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/medical license/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/mother \/ patient id/i)).not.toBeInTheDocument();
    });

    it("dynamically changes identifier field when switching portals", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      // Switch to Doctor
      const doctorPortalBtn = screen.getByRole("button", { name: /doctor/i });
      await user.click(doctorPortalBtn);
      expect(screen.getByLabelText(/medical license/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/doctor id/i)).not.toBeInTheDocument();

      // Switch to Caregiver
      const caregiverPortalBtn = screen.getByRole("button", { name: /caregiver/i });
      await user.click(caregiverPortalBtn);
      expect(screen.getByLabelText(/mother \/ patient id/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/medical license/i)).not.toBeInTheDocument();
    });

    it("renders only email and password for admin login", () => {
      renderAuthPage({ adminOnly: true });
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/doctor id/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/medical license/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/mother \/ patient id/i)).not.toBeInTheDocument();
    });

    it("submits login with portal and corresponding identifier", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      await user.type(screen.getByLabelText(/email/i), "mother@nurtureher.com");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/doctor id/i), "DOC-100001");

      await user.click(screen.getByRole("button", { name: /^sign in$/i }));

      expect(mockSignIn).toHaveBeenCalledWith(
        "mother@nurtureher.com",
        "Password123!",
        "mother",
        { doctor_id: "DOC-100001" },
      );
    });

    it("validates missing identifier before calling signIn", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      await user.type(screen.getByLabelText(/email/i), "mother@nurtureher.com");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      // Leave doctor ID empty

      const form = screen.getByRole("button", { name: /^sign in$/i }).closest("form")!;
      fireEvent.submit(form);

      expect(mockSignIn).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/doctor id is required/i);
    });
  });

  describe("Registration Form", () => {
    it("switches to registration and shows Mother registration fields by default", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      await user.click(screen.getByRole("button", { name: /register|don't have an account/i }));

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^age$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/doctor id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("validates password mismatch on registration", async () => {
      const user = userEvent.setup();
      renderAuthPage({ initialMode: "register" });

      await user.type(screen.getByLabelText(/full name/i), "Test Mother");
      await user.type(screen.getByLabelText(/email/i), "test@mother.com");
      await user.type(screen.getByLabelText(/phone number/i), "+919876543210");
      await user.type(screen.getByLabelText(/^age$/i), "28");
      await user.type(screen.getByLabelText(/doctor id/i), "DOC-100001");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/confirm password/i), "Mismatch999!");

      await user.click(screen.getByRole("button", { name: /create.*account/i }));

      expect(mockSignUp).not.toHaveBeenCalled();
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it("dynamically shows Medical License for Doctor registration", async () => {
      const user = userEvent.setup();
      renderAuthPage({ initialMode: "register" });

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, "doctor");

      expect(screen.getByLabelText(/medical license/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/doctor id/i)).not.toBeInTheDocument();
      expect(screen.getByText(/doctor accounts require administrative verification/i)).toBeInTheDocument();
    });

    it("dynamically shows Mother ID for Caregiver registration", async () => {
      const user = userEvent.setup();
      renderAuthPage({ initialMode: "register" });

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, "caregiver");

      expect(screen.getByLabelText(/mother \/ patient id/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^age$/i)).not.toBeInTheDocument();
      expect(screen.getByText(/caregiver access remains pending until the mother/i)).toBeInTheDocument();
    });
  });

  describe("Registration Success Card", () => {
    it("displays generated ID and active status for Mother registration", async () => {
      const user = userEvent.setup();
      const mockMotherUser: User = {
        id: "mock-id-1",
        email: "newmother@test.com",
        name: "New Mother",
        phone: "+919876543210",
        role: "mother",
        preferred_language: "en",
        is_verified: true,
        is_active: true,
        custom_id: "MTH-999999",
      };

      mockSignUp.mockResolvedValueOnce(mockMotherUser);

      renderAuthPage({ initialMode: "register" });

      await user.type(screen.getByLabelText(/full name/i), "New Mother");
      await user.type(screen.getByLabelText(/email/i), "newmother@test.com");
      await user.type(screen.getByLabelText(/phone number/i), "+919876543210");
      await user.type(screen.getByLabelText(/^age$/i), "26");
      await user.type(screen.getByLabelText(/doctor id/i), "DOC-100001");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

      await user.click(screen.getByRole("button", { name: /create.*account/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });

      expect(screen.getByText("MTH-999999")).toBeInTheDocument();
      expect(screen.getByText(/account active/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /proceed to sign in/i })).toBeInTheDocument();
    });

    it("displays Verification Pending explanation for Doctor registration", async () => {
      const user = userEvent.setup();
      const mockDoctorUser: User = {
        id: "mock-id-2",
        email: "newdoc@test.com",
        name: "Dr. Test",
        phone: "+919876543211",
        role: "doctor",
        preferred_language: "en",
        is_verified: false,
        is_active: true,
        custom_id: "DOC-999999",
        medical_license: "MCI-99999",
      };

      mockSignUp.mockResolvedValueOnce(mockDoctorUser);

      renderAuthPage({ initialMode: "register" });

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, "doctor");

      await user.type(screen.getByLabelText(/full name/i), "Dr. Test");
      await user.type(screen.getByLabelText(/email/i), "newdoc@test.com");
      await user.type(screen.getByLabelText(/phone number/i), "+919876543211");
      await user.type(screen.getByLabelText(/^age$/i), "35");
      await user.type(screen.getByLabelText(/medical license/i), "MCI-99999");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

      await user.click(screen.getByRole("button", { name: /create.*account/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });

      expect(screen.getByText("DOC-999999")).toBeInTheDocument();
      expect(screen.getByText(/verification pending/i)).toBeInTheDocument();
      expect(screen.getByText(/pending verification/i)).toBeInTheDocument();
    });

    it("displays Consent Pending explanation for Caregiver registration", async () => {
      const user = userEvent.setup();
      const mockCaregiverUser: User = {
        id: "mock-id-3",
        email: "caregiver@test.com",
        name: "Test Caregiver",
        phone: "+919876543212",
        role: "caregiver",
        preferred_language: "en",
        is_verified: true,
        is_active: true,
        custom_id: "CRG-999999",
        assigned_mother_id: "MTH-100001",
      };

      mockSignUp.mockResolvedValueOnce(mockCaregiverUser);

      renderAuthPage({ initialMode: "register" });

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, "caregiver");

      await user.type(screen.getByLabelText(/full name/i), "Test Caregiver");
      await user.type(screen.getByLabelText(/email/i), "caregiver@test.com");
      await user.type(screen.getByLabelText(/phone number/i), "+919876543212");
      await user.type(screen.getByLabelText(/mother \/ patient id/i), "MTH-100001");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

      await user.click(screen.getByRole("button", { name: /create.*account/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });

      expect(screen.getByText("CRG-999999")).toBeInTheDocument();
      expect(screen.getByText(/consent pending/i)).toBeInTheDocument();
    });

    it("does not display registration success if backend fails", async () => {
      const user = userEvent.setup();
      mockSignUp.mockRejectedValueOnce(new Error("Doctor with this ID not found"));

      renderAuthPage({ initialMode: "register" });

      await user.type(screen.getByLabelText(/full name/i), "Test Mother");
      await user.type(screen.getByLabelText(/email/i), "test@mother.com");
      await user.type(screen.getByLabelText(/phone number/i), "+919876543210");
      await user.type(screen.getByLabelText(/^age$/i), "28");
      await user.type(screen.getByLabelText(/doctor id/i), "DOC-INVALID");
      await user.type(screen.getByLabelText(/^password$/i), "Password123!");
      await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

      await user.click(screen.getByRole("button", { name: /create.*account/i }));

      await waitFor(() => {
        expect(screen.getByText(/doctor with this id not found/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/registration successful/i)).not.toBeInTheDocument();
    });
  });

  describe("Password visibility toggle", () => {
    it("toggles password visibility when clicking eye button", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByRole("button", { name: /show password/i });
      await user.click(toggleBtn);

      expect(passwordInput).toHaveAttribute("type", "text");

      const hideBtn = screen.getByRole("button", { name: /hide password/i });
      await user.click(hideBtn);

      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
});
