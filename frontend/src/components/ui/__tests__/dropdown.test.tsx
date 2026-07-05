import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "../dropdown";

const OPTIONS = [
  { value: "formal",      label: "Formal",        description: "Kalimat lengkap, profesional" },
  { value: "casual",      label: "Casual",        description: "Sapaan akrab, kalimat pendek" },
  { value: "persuasive",  label: "Persuasive",    description: "Social proof, angka konkret" },
];

describe("Dropdown", () => {
  it("shows placeholder when no value is selected", () => {
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} placeholder="Pilih gaya bahasa" />);
    expect(screen.getByRole("button")).toHaveTextContent("Pilih gaya bahasa");
  });

  it("shows selected label + description in trigger", () => {
    render(<Dropdown options={OPTIONS} value="formal" onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveTextContent("Formal");
    expect(trigger).toHaveTextContent("Kalimat lengkap, profesional");
  });

  it("opens list when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("calls onChange with correct value when an option is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={handleChange} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: /Casual/i }));
    expect(handleChange).toHaveBeenCalledWith("casual");
  });

  it("closes list after selecting an option", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: /Casual/i }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows check mark on the currently selected option", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="persuasive" onChange={() => {}} />);
    await user.click(screen.getByRole("button"));
    const selectedOption = screen.getByRole("option", { name: /Persuasive/i });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
  });

  it("closes on click-outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Dropdown options={OPTIONS} value="" onChange={() => {}} />
        <button>Outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: /Pilih/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Outside/i }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("trigger has aria-expanded=true when open", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} ariaLabel="Gaya bahasa" />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
