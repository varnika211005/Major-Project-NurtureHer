import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/context/auth-context";
import { LanguageProvider } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { PCOSPage, pcosBlankDefaults, pcosSchema } from "./ClinicalPages";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: {
      ...original.api,
      pcosHistory: vi.fn(),
      predictPCOS: vi.fn(),
    },
  };
});

vi.mock("@/lib/reportPdf", () => ({
  generatePrintableReportWindow: vi.fn(),
}));

const predictPCOS = vi.mocked(api.predictPCOS);
const pcosHistory = vi.mocked(api.pcosHistory);

const prediction = {
  id: "pred-1",
  risk_level: "Moderate",
  probability: 0.42,
  recommendations: "Moderate screening risk detected. Consider clinical review if symptoms persist.",
  created_at: new Date().toISOString(),
};

function renderPage() {
  return render(
    <LanguageProvider>
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          signIn: async () => undefined,
          signUp: async () => undefined,
          signOut: async () => undefined,
        }}
      >
        <PCOSPage />
      </AuthContext.Provider>
    </LanguageProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Age"), "28");
  await user.type(screen.getByLabelText("BMI"), "24.5");
  await user.selectOptions(screen.getByLabelText(/cycle category/i), "4");
  await user.type(screen.getByLabelText("Cycle length"), "30");
  await user.click(screen.getByLabelText("Excess hair growth"));
  await user.click(screen.getByLabelText("Pimples / acne"));
}

beforeEach(() => {
  vi.clearAllMocks();
  pcosHistory.mockResolvedValue([]);
  predictPCOS.mockResolvedValue({ ...prediction });
});

afterEach(() => {
  cleanup();
});

describe("PCOS screening schema", () => {
  it("starts blank: numerics/cycle undefined, symptoms unchecked", () => {
    expect(pcosBlankDefaults.age).toBeUndefined();
    expect(pcosBlankDefaults.bmi).toBeUndefined();
    expect(pcosBlankDefaults.cycle).toBeUndefined();
    expect(pcosBlankDefaults.cycleLength).toBeUndefined();
    expect(pcosBlankDefaults.weightGain).toBe(false);
    expect(pcosBlankDefaults.hairGrowth).toBe(false);
    expect(pcosBlankDefaults.skinDarkening).toBe(false);
    expect(pcosBlankDefaults.hairLoss).toBe(false);
    expect(pcosBlankDefaults.pimples).toBe(false);
  });

  it("blank inputs fail with understandable required messages", () => {
    const parsed = pcosSchema.safeParse({ ...pcosBlankDefaults });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Age is required.");
      expect(messages).toContain("BMI is required.");
      expect(messages).toContain("Cycle length is required.");
      expect(messages).toContain("Please select a cycle category.");
      expect(messages.join(" ")).not.toMatch(/nan/i);
    }
  });

  it("accepts cycle 2 and 4 but rejects other values", () => {
    const base = {
      age: 28,
      bmi: 24.5,
      cycleLength: 30,
      weightGain: false,
      hairGrowth: false,
      skinDarkening: false,
      hairLoss: false,
      pimples: false,
    };
    expect(pcosSchema.safeParse({ ...base, cycle: 2 }).success).toBe(true);
    expect(pcosSchema.safeParse({ ...base, cycle: 4 }).success).toBe(true);
    expect(pcosSchema.safeParse({ ...base, cycle: 3 }).success).toBe(false);
    expect(pcosSchema.safeParse({ ...base, cycle: 5 }).success).toBe(false);
  });
});

describe("PCOSPage form", () => {
  it("renders blank with a required cycle placeholder and blocks empty submit", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText("Age")).toHaveValue(null);
    expect(screen.getByLabelText("BMI")).toHaveValue(null);
    expect(screen.getByLabelText("Cycle length")).toHaveValue(null);
    expect(screen.getByLabelText(/cycle category/i)).toHaveValue("");
    for (const label of ["Excess hair growth", "Pimples / acne"]) {
      expect(screen.getByLabelText(label)).not.toBeChecked();
    }

    await user.click(screen.getByRole("button", { name: /run prediction/i }));

    expect(await screen.findByText("Age is required.")).toBeInTheDocument();
    expect(screen.getByText("BMI is required.")).toBeInTheDocument();
    expect(screen.getByText("Cycle length is required.")).toBeInTheDocument();
    expect(screen.getByText("Please select a cycle category.")).toBeInTheDocument();
    expect(predictPCOS).not.toHaveBeenCalled();
  });

  it("submits the exact nine-field payload and shows the returned result", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /run prediction/i }));

    await waitFor(() => expect(predictPCOS).toHaveBeenCalledTimes(1));
    expect(predictPCOS).toHaveBeenCalledWith({
      age: 28,
      bmi: 24.5,
      cycle: 4,
      cycle_length: 30,
      weight_gain: false,
      hair_growth: true,
      skin_darkening: false,
      hair_loss: false,
      pimples: true,
    });

    // Result reflects the returned prediction (risk, probability, recommendations).
    expect(await screen.findByText("Model-based screening estimate")).toBeInTheDocument();
    expect(screen.queryByText("Validated Screening")).not.toBeInTheDocument();
    expect(screen.getByText(/Moderate screening risk detected/)).toBeInTheDocument();
    expect(screen.getByText("Moderate Risk")).toBeInTheDocument();
    // Probability surfaces in both the gauge and the new history row.
    expect(screen.getAllByText("42%")).toHaveLength(2);
    // History updated with the new screening.
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("clears inputs after success without erasing the result", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /run prediction/i }));
    await screen.findByText("Model-based screening estimate");

    expect(screen.getByLabelText("Age")).toHaveValue(null);
    expect(screen.getByLabelText("BMI")).toHaveValue(null);
    expect(screen.getByLabelText("Cycle length")).toHaveValue(null);
    expect(screen.getByLabelText(/cycle category/i)).toHaveValue("");
    expect(screen.getByLabelText("Excess hair growth")).not.toBeChecked();
    // Displayed result and history survive the reset.
    expect(screen.getByText("Model-based screening estimate")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("keeps user input and reports an error when prediction fails", async () => {
    const user = userEvent.setup();
    predictPCOS.mockRejectedValueOnce(new Error("Network down"));
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /run prediction/i }));

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.queryByText("Model-based screening estimate")).not.toBeInTheDocument();
    // Inputs preserved for retry.
    expect(screen.getByLabelText("Age")).toHaveValue(28);
    expect(screen.getByLabelText(/cycle category/i)).toHaveValue("4");
    expect(screen.getByLabelText("Excess hair growth")).toBeChecked();
  });

  it("uses newly entered values on each subsequent screening", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /run prediction/i }));
    await screen.findByText("Model-based screening estimate");

    // Capture handles once, then clear before typing: clearing re-syncs
    // user-event's internal value cache, which a programmatic form reset
    // would otherwise leave stale (test-environment only; real browsers
    // always type into the live DOM value).
    const age = screen.getByLabelText("Age");
    const bmi = screen.getByLabelText("BMI");
    const cycle = screen.getByLabelText(/cycle category/i);
    const cycleLength = screen.getByLabelText("Cycle length");
    await user.clear(age);
    await user.type(age, "35");
    await user.clear(bmi);
    await user.type(bmi, "29");
    await user.selectOptions(cycle, "2");
    await user.clear(cycleLength);
    await user.type(cycleLength, "40");
    await user.click(screen.getByRole("button", { name: /run prediction/i }));

    await waitFor(() => expect(predictPCOS).toHaveBeenCalledTimes(2));
    expect(predictPCOS).toHaveBeenLastCalledWith({
      age: 35,
      bmi: 29,
      cycle: 2,
      cycle_length: 40,
      weight_gain: false,
      hair_growth: false,
      skin_darkening: false,
      hair_loss: false,
      pimples: false,
    });
  });
});
