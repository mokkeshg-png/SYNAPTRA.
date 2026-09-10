import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className={`w-full rounded-xl bg-white p-5 shadow-lift ${wide ? "max-w-3xl" : "max-w-lg"}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <DialogTitle className="font-serif text-xl text-ink">{title}</DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
