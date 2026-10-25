import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./SupportPages";
import { api, Profile, User } from "@/lib/api";
import { AuthContext } from "@/context/auth-context";

const mockCaregiverUser: User = {
  id: "usr-caregiver-123",
  email: "ramesh.caregiver@example.com",
  name: "Ramesh Rao",
  phone: "+91 98765 43210",
  role: "caregiver",
  preferred_language: "en",
  is_verified: true,
  is_active: true,
  custom_id: "CRG-100200",
  assigned_mother_id: "MTH-555666",
  relationship_label: "Husband",
};

const mockCaregiverProfileApproved: Profile = {
  id: "usr-caregiver-123",
  user_id: "usr-caregiver-123",
  email: "ramesh.caregiver@example.com",
  name: "Ramesh Rao",
  phone: "+91 98765 43210",
  role: "caregiver",
  preferred_language: "en",
  custom_id: "CRG-100200",
  caregiver_id: "CRG-100200",
  assigned_mother_id: "MTH-555666",
  caregiver_status: "approved",
  relationship_label: "Husband",
  linked_mother: {
    id: "mth-user-uuid",
    name: "Sunita Rao",
    custom_id: "MTH-555666",
  },
};

function renderProfileWithAuth(currentUser: User | null = mockCaregiverUser) {
  return render(
    <AuthContext.Provider
      value={{
        user: currentUser,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("Caregiver Profile Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders simplified Caregiver profile with correct title, subtitle, and registration details", async () => {
    vi.spyOn(api, "profile").mockResolvedValue(mockCaregiverProfileApproved);

    renderProfileWithAuth();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    });

    expect(
      screen.getByText("Your account information and connection status."),
    ).toBeInTheDocument();

    // Verify registration details from caregiver registration form
    expect(screen.getAllByText("Ramesh Rao").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ramesh.caregiver@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(screen.getAllByText("CRG-100200").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Caregiver").length).toBeGreaterThanOrEqual(1);

    // Verify maternal health form fields are REMOVED
    expect(screen.queryByText("Maternal Health Profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Expected / Delivery Date")).not.toBeInTheDocument();
    expect(screen.queryByText("Pregnancy / Postpartum Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Blood Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Weight (kg)")).not.toBeInTheDocument();
    expect(screen.queryByText("Height (cm)")).not.toBeInTheDocument();
    expect(screen.queryByText("Emergency Contact Phone")).not.toBeInTheDocument();
    expect(screen.queryByText("Village / Locality")).not.toBeInTheDocument();

    // Verify obsolete maternal-health save button is REMOVED
    expect(screen.queryByRole("button", { name: /Save Profile Details/i })).not.toBeInTheDocument();
  });

  it("renders Mother Connection section with approved status and linked mother details", async () => {
    vi.spyOn(api, "profile").mockResolvedValue(mockCaregiverProfileApproved);

    renderProfileWithAuth();

    await waitFor(() => {
      expect(screen.getByText("Mother Connection")).toBeInTheDocument();
    });

    expect(screen.getByText("Approved by Patient")).toBeInTheDocument();
    expect(screen.getByText("Sunita Rao")).toBeInTheDocument();
    expect(screen.getByText("MTH-555666")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Dashboard/i })).toBeInTheDocument();

    // Critical privacy requirement: no private maternal clinical data exposed
    expect(screen.queryByText(/screening score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/epds/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/symptom log/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nutrition intake/i)).not.toBeInTheDocument();
  });

  it("renders pending consent status when mother has not approved yet", async () => {
    vi.spyOn(api, "profile").mockResolvedValue({
      ...mockCaregiverProfileApproved,
      caregiver_status: "pending",
      linked_mother: {
        id: "mth-user-uuid",
        name: "Pooja Sharma",
        custom_id: "MTH-777888",
      },
    });

    renderProfileWithAuth();

    await waitFor(() => {
      expect(screen.getByText("Pending Patient Consent")).toBeInTheDocument();
    });

    expect(screen.getByText(/Awaiting Patient Consent/i)).toBeInTheDocument();
    expect(screen.getByText(/MTH-777888/)).toBeInTheDocument();
  });

  it("renders friendly empty state when no mother is linked", async () => {
    vi.spyOn(api, "profile").mockResolvedValue({
      ...mockCaregiverProfileApproved,
      caregiver_status: "not_linked",
      assigned_mother_id: null,
      linked_mother: null,
    });

    const unlinkedUser: User = {
      ...mockCaregiverUser,
      assigned_mother_id: null,
    };

    renderProfileWithAuth(unlinkedUser);

    await waitFor(() => {
      expect(screen.getByText("No Mother Linked Yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Connect with an expectant or new mother using her CareCircle QR code/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect via CareCircle/i })).toBeInTheDocument();
  });

  it("gracefully falls back to cached session user when api.profile fails with 401/Invalid credentials", async () => {
    vi.spyOn(api, "profile").mockRejectedValue(new Error("Invalid authentication credentials"));

    renderProfileWithAuth();

    // Should NOT show raw error message
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    });

    expect(screen.queryByText("Invalid authentication credentials")).not.toBeInTheDocument();

    // Should display registration details from the cached user session
    expect(screen.getAllByText("Ramesh Rao").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ramesh.caregiver@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(screen.getAllByText("CRG-100200").length).toBeGreaterThanOrEqual(1);
  });
});
