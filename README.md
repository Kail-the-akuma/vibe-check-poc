## Funcionalidades Principais

### 1. Deteção Avançada de Segredos (Secrets)
O VibeCheck realiza uma varredura local instantânea para identificar credenciais expostas antes mesmo de enviar o código para a IA, protegendo os seus dados e poupando custos.
- **Cloud Keys**: AWS (Access/Secret keys), Google Cloud API keys.
- **SaaS Tokens**: Slack, GitHub, Stripe e JWTs.
- **Databases**: Strings de conexão para Postgres, MongoDB e SQL Server.

### 2. Auditoria de Segurança IA (OWASP & LLM)
Utiliza IA para identificar vulnerabilidades complexas que ferramentas estáticas tradicionais ignoram:
- **OWASP Top 10**: XSS, SQL Injection, Deserialização Insegura, etc.
- **LLM Top 10**: Injeção de Prompts, "Excessive Agency" (execução insegura de ferramentas por agentes IA) e exposição de instruções de sistema.

### 3. Reforço de Regras de Arquitetura (Enterprise)
Atua como um Arquiteto de Software automatizado, validando a estrutura do projeto:
- **Layer Boundaries**: Garante que a lógica de domínio não depende da infraestrutura.
- **DDD & CQRS**: Valida se os comandos não retornam dados complexos e se a lógica de negócio está nos sítios certos.
- **Isolamento de Domínio**: Evita fugas de lógica entre diferentes módulos.
- **Convenções de Nomenclatura**: Verifica se os nomes de ficheiros e classes respeitam o seu papel arquitetural (ex: `*Controller`).

### 4. Qualidade de Código e Boas Práticas
Promove um código limpo e mantível:
- **Guard Clauses**: Identifica "Arrow Code" (ifs aninhados) e sugere retornos antecipados.
- **Princípio DRY**: Deteta lógica duplicada.
- **Otimização de Switch-Case**: Sugere `switch` para cadeias longas de `if-else`.
- **Princípios OOP**: Alerta para "Obsessão por Primitivos" e sugere o uso de DTOs ou Objetos.

---

##  Performance e Eficiência

- **Processamento Paralelo**: Analisa ficheiros em lotes, reduzindo drasticamente o tempo de execução.
- **Smart Caching**: Utiliza um sistema de cache baseado em hashes de conteúdo. Se o ficheiro não mudou, o resultado é instantâneo e custa **zero tokens**.
- **Limpeza de Código**: Remove espaços e linhas vazias antes do envio para a IA, reduzindo o consumo de tokens em cerca de **20-30%**.
- **Recomendações de Correção (💡 Fix)**: Cada vulnerabilidade encontrada inclui uma sugestão prática de como a resolver.

---

##  Stack Tecnológica
- **Runtime**: Node.js (ES Modules)
- **Cérebro**: OpenAI API (`gpt-4o-mini`)
- **UI**: Chalk (Terminal colorido)
- **Segurança**: Dotenv para gestão de chaves API

---

##  Como Testar

Navegue até à pasta do projeto e execute:

```powershell
# Auditoria de uma pasta completa
node index.js test-files

# Teste específico de Segredos
node index.js test-files/secrets-test.js

# Teste de Regras de Arquitetura
node index.js test-files/architecture-violations.cs

# Teste de Qualidade de Código (Guard Clauses, DRY)
node index.js test-files/code-quality-violations.js
```

---

## 🏆 Conclusões da Prova de Conceito (POC) & O Futuro do VibeCheck

O VibeCheck provou ser uma ferramenta de **valor incalculável** num ambiente de *DevSecOps*. Durante a sua aplicação real (ex: projeto *HomeSync*), demonstrou o poder de detetar *Silent Failures*, vulnerabilidades e problemas de concorrência que frequentemente escapam em revisões de código manuais.

No entanto, a execução desta POC também expôs de forma clara a **maior fraqueza dos Scanners IA puramente baseados em texto: As Alucinações de Sintaxe**.

### O Limite da Análise Textual Pura (LLMs)
Por não construir uma Árvore de Sintaxe Abstrata (AST) típica dos compiladores ou linters clássicos (ex: ESLint, Babel), a IA opera de forma puramente semântica e por vezes "cega" à estrutura matemática do código:
- **Falsos Positivos em Cleanups e Try/Catch:** A IA pode ignorar blocos `catch` ou funções de limpeza (ex: `removeChannel` do Supabase) se estiverem escritos de forma ligeiramente diferente do habitual ou dentro de closures/callbacks.
- **Pedantismo Arquitetural:** Modelos genéricos tendem a sugerir padrões pesados (como Mutex Locks) em ambientes Single-Threaded (como JavaScript/React Native) ou a exigir "encriptação militar" para armazenamento local rudimentar (ex: `AsyncStorage`).
- **Falsos Segredos:** O pattern-matching de texto pode levar a IA a sinalizar URLs de APIs 100% públicas como se fossem fugas confidenciais de "API Keys".

### O Próximo Nível (A Visão V2)
Para evoluir de POC para uma ferramenta Enterprise de mercado, o VibeCheck adotará uma **abordagem híbrida**:
1. **Integração com AST Parsers:** Usar analisadores de sintaxe reais para validar estruturalmente a existência de controlos de fluxo, bloqueando os delírios da IA antes do report final.
2. **Contexto Estrito & Dual Scoring:** O VibeCheck já implementa um "Modo Tolerante" (*Personal Use Score*) e regras draconianas de contexto explícito para neutralizar o instinto pedante da IA, adequando a análise ao tipo de projeto (Enterprise vs MVP).

**Resumindo:** A inteligência artificial é um auditor genial para detetar falhas lógicas e de segurança que ferramentas tradicionais não apanham, mas precisa de "balizas" sintáticas estritas para evitar "reinventar a roda" em falsos positivos.

---

*Desenvolvido como uma Prova de Conceito (POC) para demonstrar o poder e os desafios da IA na garantia de qualidade e segurança em ambientes de desenvolvimento modernos.*
