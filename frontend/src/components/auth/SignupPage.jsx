import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const SignupPage = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [pseudonyme, setPseudonyme] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signup(email, pseudonyme, password, confirmPassword);
      if (!result.success) {
        const errorMessage = result.error || 'Erreur lors de l\'inscription';
        setError(errorMessage);
        addToast({
          type: 'error',
          title: 'Erreur d\'inscription',
          description: errorMessage,
          duration: 5000
        });
      } else {
        addToast({
          type: 'success',
          title: 'Inscription réussie',
          description: `Bienvenue ${pseudonyme} ! Votre compte a été créé avec succès.`,
          duration: 4000
        });
      }
    } catch (err) {
      const errorMessage = 'Erreur de connexion au serveur';
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Erreur d\'inscription',
        description: errorMessage,
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-primary transform rotate-45 mr-3"></div>
            <h1 className="text-2xl font-semibold">Odoo Chatbot</h1>
          </div>
          <p className="text-muted-foreground">
            Créez votre compte pour commencer.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Pseudonyme"
                value={pseudonyme}
                onChange={(e) => setPseudonyme(e.target.value)}
                required
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-input"
              />
            </div>

            {error && (
              <div className="text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer un compte'}
            </Button>

            <div className="text-center">
              <span className="text-muted-foreground">
                Vous avez déjà un compte ?{' '}
              </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline font-medium"
              >
                Se connecter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;