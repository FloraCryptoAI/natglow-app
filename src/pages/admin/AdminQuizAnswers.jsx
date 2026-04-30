import React from 'react'
import { ClipboardList } from 'lucide-react'

export default function AdminQuizAnswers() {
  return <ComingSoon icon={ClipboardList} title="Respostas do Quiz" />
}

function ComingSoon({ icon: Icon, title }) {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-extrabold text-stone-900">{title}</h1>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-stone-400" />
        </div>
        <p className="font-bold text-stone-700 mb-1">Em breve</p>
        <p className="text-sm text-stone-400">Este módulo será implementado na próxima etapa.</p>
      </div>
    </div>
  )
}
