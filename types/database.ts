// Placeholder. Substitua pelos tipos reais com:
//   npm run db:types
// Por enquanto, uso `any` pra não acoplar o código aos tipos antes da
// primeira geração. Depois que `db:types` rodar, esse arquivo é
// sobrescrito com tipagem fina.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
