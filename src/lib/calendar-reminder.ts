/** A calendar event is opt-in and independent of platform push notifications. */
export function calendarReminder(hour: number, minute: number, remainingDays: number, origin: string, now = new Date()) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error("Horário inválido.");
  if (!Number.isInteger(remainingDays) || remainingDays < 1 || remainingDays > 90) throw new Error("Duração inválida.");
  const url = new URL("/devocional", origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("Endereço inválido.");
  const start = new Date(now); start.setHours(hour, minute, 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 15*60*1000);
  const two = (n: number) => String(n).padStart(2,"0");
  // Floating local time: the calendar uses the device's local time zone.
  const local = (d: Date) => `${d.getFullYear()}${two(d.getMonth()+1)}${two(d.getDate())}T${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
  const utc = now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Sempre Positivo//Devocional//PT-BR","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",`UID:devocional-${now.getTime()}@${url.hostname}`,`DTSTAMP:${utc}`,`DTSTART:${local(start)}`,`DTEND:${local(end)}`,`RRULE:FREQ=DAILY;COUNT=${remainingDays}`,"SUMMARY:Meu momento de leitura — É Amargo\\, Mas Cura",`DESCRIPTION:Reserve um momento para ler e refletir. Acesse ${url.href}`,`URL:${url.href}`,"BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:PT0M","DESCRIPTION:Seu momento de leitura","END:VALARM","END:VEVENT","END:VCALENDAR"];
  // RFC 5545 limits physical lines to 75 octets, including UTF-8 characters.
  const fold = (line: string) => {
    let result = "", size = 0;
    for (const character of line) {
      const bytes = new TextEncoder().encode(character).length;
      if (size + bytes > 75) {result += "\r\n "; size = 1;}
      result += character; size += bytes;
    }
    return result;
  };
  return lines.map(fold).join("\r\n") + "\r\n";
}
