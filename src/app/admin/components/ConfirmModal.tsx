"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isProcessing?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-emerald-600 hover:bg-emerald-700",
  isProcessing = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium ${confirmButtonClass}`}
          >
            {isProcessing ? (
              <>
                <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
