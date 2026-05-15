import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function LegalLine({ className = '' }) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es')

  return (
    <p className={`text-xs text-gray-400 text-center mt-8 pb-6 ${className}`}>
      {isEs ? (
        <>
          Al continuar, aceptas nuestros{' '}
          <Link to="/terms"   className="text-gray-500 underline underline-offset-2 decoration-gray-300 hover:text-gray-600">Términos</Link>
          {' '}y{' '}
          <Link to="/privacy" className="text-gray-500 underline underline-offset-2 decoration-gray-300 hover:text-gray-600">Privacidad</Link>
        </>
      ) : (
        <>
          By continuing, you agree to our{' '}
          <Link to="/terms"   className="text-gray-500 underline underline-offset-2 decoration-gray-300 hover:text-gray-600">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-gray-500 underline underline-offset-2 decoration-gray-300 hover:text-gray-600">Privacy</Link>
        </>
      )}
    </p>
  )
}
