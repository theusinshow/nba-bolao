# Guia rápido — gerenciamento de usuários no Supabase

Este arquivo reúne os comandos SQL mais úteis para administrar o acesso ao bolão pelo Supabase.

## Onde usar

- Abra o painel do Supabase
- Entre em `SQL Editor`
- Cole o comando desejado
- Clique em `Run`

## Tabela principal de acesso

O login no bolão é controlado principalmente pela tabela:

- `allowed_emails`

Se o email estiver nessa tabela, o usuário pode entrar no app.

## 1. Listar todos os emails liberados

```sql
select email
from allowed_emails
order by email;
```

## 2. Contar quantos emails estão liberados

```sql
select count(*) as total
from allowed_emails;
```

## 3. Verificar se um email específico já está liberado

```sql
select *
from allowed_emails
where email = 'email@exemplo.com';
```

## 4. Liberar um email para login

```sql
insert into allowed_emails (email)
values ('email@exemplo.com');
```

## 5. Liberar um email sem erro caso ele já exista

```sql
insert into allowed_emails (email)
values ('email@exemplo.com')
on conflict (email) do nothing;
```

## 6. Liberar vários emails de uma vez

```sql
insert into allowed_emails (email)
values
  ('amigo1@email.com'),
  ('amigo2@email.com'),
  ('amigo3@email.com')
on conflict (email) do nothing;
```

## 7. Remover um email liberado

```sql
delete from allowed_emails
where email = 'email@exemplo.com';
```

## 8. Ver participantes já criados no sistema

```sql
select id, name, email, is_admin
from participants
order by name;
```

## 9. Procurar um participante por email

```sql
select id, name, email, is_admin
from participants
where email = 'email@exemplo.com';
```

## 10. Tornar um participante admin

```sql
update participants
set is_admin = true
where email = 'email@exemplo.com';
```

## 11. Remover privilégio de admin

```sql
update participants
set is_admin = false
where email = 'email@exemplo.com';
```

## 12. Ver apenas os admins atuais

```sql
select id, name, email
from participants
where is_admin = true
order by name;
```

## 13. Conferir quais usuários autenticados ainda não viraram participantes

Observação:
- Isso depende do schema do Supabase Auth estar acessível no seu projeto.
- Em alguns projetos, essa consulta pode exigir permissões específicas.

```sql
select u.id, u.email
from auth.users u
left join participants p on p.user_id = u.id
where p.id is null
order by u.email;
```

## 14. Remover um participante do bolão por completo

Importante:
- não use mais apenas `delete from participants`, porque isso pode deixar palpites órfãos e registros antigos aparecendo na interface;
- a remoção operacional correta agora é pelo script do backend, que limpa os vínculos do participante no bolão inteiro.

No terminal:

```powershell
cd C:\Dev\pessoal\projetos\nba-bolao\backend
npm run remove:participant -- --email email@exemplo.com
```

Você também pode remover por:

```powershell
npm run remove:participant -- --participant-id UUID_DO_PARTICIPANTE
```

ou:

```powershell
npm run remove:participant -- --user-id UUID_DO_AUTH_USER
```

O processo remove:
- `series_picks`
- `game_picks`
- `simulation_series_picks`
- `simulation_game_picks`
- o registro em `participants`
- o email em `allowed_emails`

Observação:
- a conta do usuário no Supabase Auth não é apagada;
- o objetivo é remover a pessoa do bolão de forma completa, sem deixar rastro funcional no app.

## 15. Checklist rápido para liberar um amigo

Passos mais comuns:

1. Adicionar o email em `allowed_emails`
2. Pedir para a pessoa fazer login
3. Confirmar se ela apareceu em `participants`
4. Se necessário, promover para admin

## Observações importantes

- O usuário só entra no bolão se o email estiver em `allowed_emails`
- O registro em `participants` normalmente é criado automaticamente no primeiro login
- Para testes com amigos, prefira sempre usar `on conflict do nothing` ao inserir emails
- Evite apagar dados direto em produção sem confirmar o ambiente
