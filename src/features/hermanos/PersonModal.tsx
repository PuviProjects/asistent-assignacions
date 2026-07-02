import { useEffect } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import { SLOT_DEFS } from "@/lib/dates";
import { useDb, type PersonInput } from "@/store/db";
import { STATUS_LABEL, type Person, type Status } from "@/types";

const STATUS_ORDER: Status[] = ["PR", "AC", "AO", "PN"];

interface PersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Person id being edited, or null to create a new one. */
  personId: string | null;
}

type FormValues = PersonInput;

const EMPTY: FormValues = {
  nom: "",
  sex: "H",
  status: "AO",
  fixedOff: [],
  inc: [],
  pref: [],
  absences: [],
};

export function PersonModal({ open, onOpenChange, personId }: PersonModalProps) {
  const people = useDb((s) => s.people);
  const addPerson = useDb((s) => s.addPerson);
  const updatePerson = useDb((s) => s.updatePerson);
  const removePerson = useDb((s) => s.removePerson);

  const editing = personId
    ? people.find((p) => p.id === personId)
    : undefined;

  const { register, handleSubmit, reset, control, formState } =
    useForm<FormValues>({ defaultValues: EMPTY });

  // Sync form when opening or switching target.
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            nom: editing.nom,
            sex: editing.sex,
            status: editing.status,
            fixedOff: [...(editing.fixedOff ?? [])],
            inc: [...(editing.inc ?? [])],
            pref: [...(editing.pref ?? [])],
            absences: (editing.absences ?? []).map((a) => ({ ...a })),
          }
        : EMPTY,
    );
  }, [open, personId, editing, reset]);

  function onSubmit(values: FormValues) {
    const payload: PersonInput = { ...values, nom: values.nom.trim() };
    if (editing) updatePerson(editing.id, payload);
    else addPerson(payload);
    toast.success("Desat");
    onOpenChange(false);
  }

  function onDelete() {
    if (!editing) return;
    if (
      !window.confirm(
        "Eliminar aquest germà/ana? També s'esborrarà de les assignacions.",
      )
    )
      return;
    removePerson(editing.id);
    toast.success("Eliminat");
    onOpenChange(false);
  }

  const others = people
    .filter((p) => p.id !== personId)
    .sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar germà/ana" : "Nou germà/ana"}
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={onDelete} className="mr-auto">
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel·lar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={formState.isSubmitting}
          >
            Desar
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Nom complet" htmlFor="nom">
          <Input
            id="nom"
            placeholder="Nom i cognom"
            autoFocus
            {...register("nom", { required: true })}
            className={cn(
              formState.errors.nom && "border-danger focus-visible:border-danger",
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sexe" htmlFor="sex">
            <Select id="sex" {...register("sex")}>
              <option value="H">Home</option>
              <option value="D">Dona</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" {...register("status")}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s} · {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="No disponible de forma fixa"
          hint="Franges que mai pot cobrir (ex.: feina els dimarts al matí)."
        >
          <Controller
            control={control}
            name="fixedOff"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {SLOT_DEFS.map((s) => {
                  const on = field.value.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          on
                            ? field.value.filter((x) => x !== s.id)
                            : [...field.value, s.id],
                        )
                      }
                      className={cn(
                        "h-8 px-3 rounded-md border text-[13px] font-medium transition-colors",
                        on
                          ? "bg-primary-soft border-primary text-primary-soft-fg"
                          : "bg-surface border-border-strong text-text-muted hover:border-text-subtle",
                      )}
                    >
                      {s.label} {s.tag}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Field>

        <Field
          label="Períodes d'absència (vacances…)"
          hint="Dins d'aquestes dates no sortirà disponible enlloc, sense haver de marcar dia a dia."
        >
          <Controller
            control={control}
            name="absences"
            render={({ field }) => (
              <div className="space-y-2">
                {field.value.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <DatePicker
                      value={a.from}
                      maxISO={a.to}
                      placeholder="Des de"
                      className="flex-1"
                      onChange={(iso) =>
                        field.onChange(
                          field.value.map((x, j) =>
                            j === i ? { ...x, from: iso } : x,
                          ),
                        )
                      }
                    />
                    <span className="text-text-subtle text-sm shrink-0">→</span>
                    <DatePicker
                      value={a.to}
                      minISO={a.from}
                      placeholder="Fins a"
                      className="flex-1"
                      onChange={(iso) =>
                        field.onChange(
                          field.value.map((x, j) =>
                            j === i ? { ...x, to: iso } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange(field.value.filter((_, j) => j !== i))
                      }
                      aria-label="Treure període"
                      className="shrink-0 size-8 inline-flex items-center justify-center rounded-md text-text-subtle hover:bg-danger-soft hover:text-danger transition-colors"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    field.onChange([...field.value, { from: "", to: "" }])
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  Afegir període
                </Button>
              </div>
            )}
          />
        </Field>

        <Field
          label="Preferència de parella (anar junts)"
          hint="Germans amb qui hauria d'anar preferentment (ex.: matrimonis)."
        >
          <PeoplePicker control={control} name="pref" others={others} />
        </Field>

        <Field
          label="Incompatibilitats fixes (mai junts)"
          hint="Germans amb qui no ha de coincidir mai."
        >
          <PeoplePicker control={control} name="inc" others={others} />
        </Field>
      </form>
    </Dialog>
  );
}

function PeoplePicker({
  control,
  name,
  others,
}: {
  control: Control<FormValues>;
  name: "inc" | "pref";
  others: Person[];
}) {
  if (others.length === 0) {
    return (
      <p className="text-[13px] text-text-subtle">
        Encara no hi ha altres germans.
      </p>
    );
  }
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border-strong divide-y divide-border">
          {others.map((p) => {
            const on = field.value.includes(p.id);
            return (
              <label
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-surface-2 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    field.onChange(
                      on
                        ? field.value.filter((x) => x !== p.id)
                        : [...field.value, p.id],
                    )
                  }
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="flex-1">{p.nom}</span>
                <StatusPill status={p.status} />
              </label>
            );
          })}
        </div>
      )}
    />
  );
}
