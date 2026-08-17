import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/custo-influencer/integrations/supabase/client";

export function CustosSignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda(o)!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        toast.success("Conta criada. Peça a um Marketing para liberar seu perfil.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm card-blow p-6">
      <h3 className="text-lg font-semibold mb-1 text-[color:var(--color-blow-orange-dark)]">
        Custos de Influência
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Login próprio deste módulo (separado da senha de Administração).
      </p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "Não tem conta? Criar uma" : "Já tenho conta — entrar"}
      </button>
    </div>
  );
}
