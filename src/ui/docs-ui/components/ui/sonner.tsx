import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme === "dark" ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-gray-950 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-gray-800",
          description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-gray-200 group-[.toast]:text-gray-600 dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
