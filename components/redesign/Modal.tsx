"use client"

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content 3xl:max-w-2xl 4xl:max-w-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 3xl:p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm 3xl:text-lg 4xl:text-xl font-bold text-slate-800 dark:text-slate-200">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 3xl:w-9 3xl:h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 3xl:w-5 3xl:h-5" />
          </button>
        </div>

        <div className="p-4 3xl:p-5">
          {children}
        </div>
        
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
