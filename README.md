# Assistent d'assignacions

Aplicació web per **planificar i repartir els torns de l'expositor** (parada de
testimoniatge públic) entre els germans i germanes de la congregació.

L'assistent proposa candidats per a cada torn tenint en compte l'estatus, la
disponibilitat, les incompatibilitats i l'historial, aplica les regles del
repartiment de manera automàtica i deixa que l'usuari ajusti el resultat a mà.
Tot funciona **en local, al navegador** — les dades es guarden a `localStorage`,
sense servidor ni base de dades externa.

## Què pot fer

L'aplicació té quatre vistes:

- **Germans** — el registre de persones. Per a cada germà/germana es defineix:
  - Nom, sexe (Home / Dona) i estatus (`PR` Precursor Regular, `AC` Precursor
    Auxiliar Continu, `AO` Altres Ovelles, `PN` Publicador No Batejat).
  - Torns fixos que mai pot fer (indisponibilitat permanent).
  - **Incompatibilitats** (persones amb qui no ha de coincidir) i **preferències**
    (persones amb qui és preferible que vagi, p. ex. matrimonis). Les relacions
    es mantenen simètriques automàticament.
  - Absències per rangs de dates (vacances, etc.).

- **Disponibilitat** — graella mensual per marcar, torn a torn, qui **no està
  disponible** aquell mes concret (a més de la indisponibilitat fixa).

- **Planificació** — el cor de l'aplicació. Per al mes seleccionat mostra tots els
  torns setmanals i, per a cada un:
  - **Suggeriments ordenats** de candidats vàlids amb la puntuació i el motiu
    (prioritat per estatus, si encara no ha sortit aquest mes, repartiment per
    setmanes, combinacions noves, aportar el baró necessari…).
  - **Assignació automàtica del mes** amb un clic (algorisme voraç que omple tots
    els torns respectant les regles i prioritzant que hi hagi almenys un baró).
  - Ajust manual: seure/treure persones, **moure o intercanviar** assignacions
    entre torns, i buidar el mes.
  - **Avisos en línia** quan una assignació trenca una regla o és poc ideal.

- **Configuració** — paràmetres ajustables del repartiment: places per torn
  (`seatsPerSlot`), pes de prioritat per estatus i objectiu orientatiu
  d'assignacions al mes per estatus. També permet **exportar/importar** tota la
  base de dades (JSON) i restaurar les dades inicials.

### Regles d'assignació

El motor (`src/lib/planning.ts`) aplica regles dures (bloquegen) i toves
(penalitzen la puntuació):

- Ningú fa dos torns **seguits** (ni consecutius dins la mateixa setmana ni entre
  setmanes).
- No es poden ajuntar persones **incompatibles**.
- Dos `PN` no poden anar junts; un `PN` ha d'anar acompanyat d'algú d'estatus
  superior.
- Cada assignació ha de tenir almenys un **baró** (home).
- Es reparteix la feina al llarg del mes i les setmanes segons l'objectiu de cada
  estatus, s'eviten repeticions de parella del mes anterior i es prioritzen les
  parelles preferides.

## Stack tècnic

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** amb components basats en **Radix UI** (estil shadcn/ui)
- **Zustand** amb persistència a `localStorage` per a l'estat
- **date-fns** i `react-day-picker` per a dates
- **Vitest** per als tests del motor d'assignació

## Posada en marxa

```bash
pnpm install     # instal·la dependències
pnpm dev         # servidor de desenvolupament (Vite + HMR)
pnpm build       # compilació de producció (tsc + vite build)
pnpm preview     # serveix la build de producció
pnpm test        # tests (vitest run)
pnpm lint        # eslint
```

## Estructura

```
src/
  features/
    hermanos/        # registre de persones i modal d'edició
    disponibilitat/  # graella mensual de disponibilitat
    planificacio/    # planificador, suggeriments i panells
    configuracio/    # paràmetres, export/import
  lib/
    planning.ts      # motor d'assignació (funcions pures) + tests
    dates.ts         # definició de torns setmanals i utilitats de dates
    seed.ts          # dades inicials
  store/db.ts        # store Zustand + persistència
  types.ts           # model de domini i metadades d'estatus
  components/        # UI (layout, tema, primitives)
```
