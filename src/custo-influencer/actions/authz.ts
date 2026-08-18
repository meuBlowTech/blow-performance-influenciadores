import { supabase } from "@/lib/supabase";

// Reaproveita o mesmo password check já usado pelo restante da aba
// Franqueadora (clube_check_admin, no Supabase principal) — não existe mais
// login próprio para este módulo, é a mesma senha do portão da Franqueadora.
export async function assertAdminPassword(password: string): Promise<void> {
  const { data, error } = await supabase.rpc("clube_check_admin", {
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Senha de administrador inválida.");
}
