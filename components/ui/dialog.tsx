"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#171B2C]/45 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
    <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DialogPrimitive.Popup
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-[#DEE2EA] bg-white p-6 text-[#171B2C] shadow-[0_24px_70px_rgba(23,27,44,0.22)] outline-none transition-[opacity,transform] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Viewport>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
};
