import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { calendarReminder } from "@/lib/calendar-reminder";

export function CalendarReminder({ completed }: { completed: number }) {
  const [time, setTime] = useState("07:00");
  const [message, setMessage] = useState("");
  if (completed >= 90) return null;
  return <section className="space-y-4 rounded border border-ember/30 p-5">
    <h2 className="flex items-center gap-2 font-serif text-xl"><CalendarDays size={20}/>Lembrete de leitura</h2>
    <p className="text-sm text-muted-foreground">Adicione um lembrete diário ao calendário do seu celular, no horário que você preferir.</p>
    <label className="flex items-center gap-3 text-sm">Horário <input aria-label="Horário do lembrete" type="time" required value={time} onChange={e => setTime(e.target.value)} className="rounded border border-input bg-background px-3 py-2"/></label>
    <button disabled={!/^\d{2}:\d{2}$/.test(time)} className="font-label rounded border border-ember px-4 py-3 text-sm disabled:opacity-50" onClick={() => {
      try {
        const [hour = NaN, minute = NaN] = time.split(":").map(Number);
        const file = new Blob([calendarReminder(hour, minute, 90-completed, location.origin)], {type:"text/calendar;charset=utf-8"});
        const url = URL.createObjectURL(file); const a = document.createElement("a");
        a.href = url; a.download = "lembrete-devocional.ics"; document.body.append(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url),60_000);
        setMessage("Abra o arquivo baixado e importe no seu calendário. Confira se o alerta está ativado.");
      } catch {setMessage("Escolha um horário válido e tente novamente.");}
    }}>Adicionar ao meu calendário</button>
    {message && <p role="status" className="text-sm">{message}</p>}
    <p className="text-xs text-muted-foreground">O aviso é do seu calendário, não uma notificação automática da plataforma. A importação e os alertas dependem do aplicativo de calendário. A série dura {90-completed} dias; para mudar ou cancelar, edite a série no calendário. Ela não acompanha alterações no seu progresso e pode avisar antes de o próximo dia ser liberado.</p>
  </section>;
}
