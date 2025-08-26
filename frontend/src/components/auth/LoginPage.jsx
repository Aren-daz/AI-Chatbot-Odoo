import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const LoginPage = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      if (!result.success) {
        const errorMessage = result.error || 'Email ou mot de passe incorrect';
        setError(errorMessage);
        addToast({
          type: 'error',
          title: 'Erreur de connexion',
          description: errorMessage,
          duration: 5000
        });
      } else {
        addToast({
          type: 'success',
          title: 'Connexion réussie',
          description: 'Vous êtes maintenant connecté !',
          duration: 3000
        });
      }
    } catch (err) {
      const errorMessage = 'Erreur de connexion au serveur';
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Erreur de connexion',
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
          <div className="space-y-2">
            <h2 className="text-xl font-medium">Connectez-vous à votre compte</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas de compte ?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-primary hover:underline font-medium"
              >
                S'inscrire
              </button>
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Se souvenir de moi
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;