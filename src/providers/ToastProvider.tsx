import React, { useState, useEffect } from "react"

import { Toast, toast, ToastState } from "@/components/Toast"

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  })

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToastState(newToast)
    })

    return unsubscribe
  }, [])

  const handleDismiss = () => {
    setToastState((prev) => ({ ...prev, visible: false }))
  }

  return (
    <>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        duration={toastState.duration}
        position={toastState.position}
        onDismiss={handleDismiss}
      />
    </>
  )
}

// Hook for easy toast usage
export const useToast = () => {
  return {
    success: (message: string, duration?: number, position?: "top" | "bottom") => {
      toast.success(message, duration, position)
    },
    warning: (message: string, duration?: number, position?: "top" | "bottom") => {
      toast.warning(message, duration, position)
    },
    error: (message: string, duration?: number, position?: "top" | "bottom") => {
      toast.error(message, duration, position)
    },
    info: (message: string, duration?: number, position?: "top" | "bottom") => {
      toast.info(message, duration, position)
    },
    hide: () => {
      toast.hide()
    },
  }
}
