/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    // ISSO AQUI É O QUE FAZ O BOTÃO FUNCIONAR: obriga o Tailwind a ouvir a classe .dark
    darkMode: 'class', 
    theme: {
      extend: {
        colors: {
          // Amarra as classes utilitárias às variáveis do seu index.css
          'bg-body': 'var(--bg-body)',
          'bg-surface': 'var(--bg-surface)',
          'bg-hover': 'var(--bg-hover)',
          
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          
          'sop-blue': 'var(--sop-blue)',
          'sop-green': 'var(--sop-green)',
          'sop-yellow': 'var(--sop-yellow)',
          'sop-red': 'var(--sop-red)',
          'sop-purple': 'var(--sop-purple)',
        },
      },
    },
    plugins: [],
  }