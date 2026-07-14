import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoUploadField } from "../logo-upload-field";

const uploadLogo = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/api/companyProfileApi", () => ({
  companyProfileApi: { uploadLogo: (...args: unknown[]) => uploadLogo(...args) },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
}));

function makeFile(name = "logo.png", type = "image/png") {
  return new File(["fake-bytes"], name, { type });
}

describe("LogoUploadField", () => {
  beforeEach(() => {
    uploadLogo.mockReset();
    toastSpy.mockReset();
  });

  it("value != null → shows preview at mount, not the dropzone", () => {
    render(<LogoUploadField value="/permanent/logos/u1/logo.png?v=1" onChange={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText(/tarik logo/i)).not.toBeInTheDocument();
  });

  it("value = null → shows the dropzone", () => {
    render(<LogoUploadField value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/tarik logo/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("failed upload → does not call onChange and does not toast success", async () => {
    uploadLogo.mockRejectedValue(new Error("upload failed"));
    const onChange = vi.fn();
    render(<LogoUploadField value={null} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile());

    await waitFor(() => expect(uploadLogo).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("successful upload → calls onChange with the response logo_url", async () => {
    uploadLogo.mockResolvedValue({ logo_url: "/permanent/logos/u1/logo.png?v=999" });
    const onChange = vi.fn();
    render(<LogoUploadField value={null} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("/permanent/logos/u1/logo.png?v=999"));
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });
});
