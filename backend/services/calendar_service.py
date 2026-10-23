"""iCalendar (RFC 5545) feed of upcoming exams and open tasks."""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from services.share_service import open_tasks, upcoming_exams


def _escape(text: str) -> str:
    return text.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\r', '').replace('\n', '\\n')


def _fold(line: str) -> str:
    """Lines longer than 75 octets continue on the next line after a space, never splitting UTF-8."""
    raw, parts = line.encode(), []
    while len(raw) > 75:
        cut = 75
        while raw[cut] & 0xC0 == 0x80: cut -= 1
        parts.append(raw[:cut].decode()); raw = b' ' + raw[cut:]
    parts.append(raw.decode())
    return '\r\n'.join(parts)


def build_ics(user_id: int, db: Session) -> str:
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyOS//StudyOS//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:StudyOS']
    day = lambda d: d.strftime('%Y%m%d')
    for exam in upcoming_exams(user_id, db):
        lines += ['BEGIN:VEVENT', f'UID:exam-{exam.id}@studyos', f'DTSTAMP:{stamp}', f'SUMMARY:{_escape(exam.title)}']
        if exam.exam_time:  # ora "floating": vale nel fuso orario di chi guarda il calendario
            lines += [f"DTSTART:{day(exam.exam_date)}T{exam.exam_time.strftime('%H%M%S')}", 'DURATION:PT2H']
        else:
            lines += [f'DTSTART;VALUE=DATE:{day(exam.exam_date)}', f'DTEND;VALUE=DATE:{day(exam.exam_date + timedelta(days=1))}']
        if exam.location: lines.append(f'LOCATION:{_escape(exam.location)}')
        lines += [f'DESCRIPTION:{_escape(exam.subject)}', 'BEGIN:VALARM', 'ACTION:DISPLAY', f'DESCRIPTION:{_escape(exam.title)}',
                  'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT']
    for task in open_tasks(user_id, db):
        if task.due_date is None: continue
        lines += ['BEGIN:VEVENT', f'UID:task-{task.id}@studyos', f'DTSTAMP:{stamp}', f'SUMMARY:{_escape(task.title)}',
                  f'DTSTART;VALUE=DATE:{day(task.due_date)}', f'DTEND;VALUE=DATE:{day(task.due_date + timedelta(days=1))}',
                  'TRANSP:TRANSPARENT', 'END:VEVENT']
    lines.append('END:VCALENDAR')
    return '\r\n'.join(_fold(line) for line in lines) + '\r\n'
