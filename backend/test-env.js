require('dotenv').config();

console.log('🔍 Test des variables d\'environnement :');
console.log('=====================================');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ PRÉSENTE' : '❌ MANQUANTE');
console.log('GROQ_MODEL:', process.env.GROQ_MODEL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('=====================================');

if (!process.env.GROQ_API_KEY) {
  console.log('❌ ERREUR: GROQ_API_KEY manquante !');
  console.log('📁 Vérifiez que le fichier .env existe dans le dossier backend/');
  console.log('🔑 Vérifiez que la clé API est bien définie');
} else {
  console.log('✅ Toutes les variables sont présentes !');
}
