import { Bell } from "lucide-react";
import { useJourney } from "@/hooks/use-journey";
import { InstallDevocional } from "@/components/install-devocional";
import { CalendarReminder } from "@/components/calendar-reminder";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ReadingTools() {
  const progress = useJourney();
  const canRemind = !!progress.ownerId && progress.maxReadableDay !== 1 && progress.completed < 90;
  return <aside aria-label="Instalação e lembrete do devocional" className="mb-8 rounded-lg border border-ember/25 bg-secondary/50 p-4">
    <p className="mb-3 font-label text-sm font-semibold">Seu devocional sempre por perto</p>
    <div className="flex flex-wrap items-center gap-3">
      <InstallDevocional prominent />
      {canRemind && <Dialog>
        <DialogTrigger asChild><button className="inline-flex items-center justify-center gap-2 rounded border border-ember/60 px-4 py-3 text-sm font-label hover:border-ember"><Bell size={16} aria-hidden="true"/>Lembrete diário</button></DialogTrigger>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reserve seu momento de leitura</DialogTitle><DialogDescription>Escolha um horário e adicione o aviso ao calendário do seu celular.</DialogDescription></DialogHeader>
          <CalendarReminder completed={progress.completed}/>
        </DialogContent>
      </Dialog>}
    </div>
    {canRemind && <p className="mt-3 text-xs text-muted-foreground">Quer lembrar da leitura todos os dias? Configure seu lembrete pelo calendário.</p>}
  </aside>;
}
