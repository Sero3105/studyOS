from pydantic import RootModel, field_validator

# Valori semplici, al massimo 50 chiavi: sono preferenze dell'interfaccia, non dati.
Value = str | int | float | bool | list[int] | list[str] | None

class Preferences(RootModel[dict[str, Value]]):
    @field_validator('root')
    @classmethod
    def small(cls, value):
        if len(value) > 50 or any(len(k) > 40 for k in value): raise ValueError('Too many or too long keys')
        if any(isinstance(v, str) and len(v) > 200 for v in value.values()): raise ValueError('Value too long')
        # Liste (es. giorni liberi del piano, date ISO): al massimo 120 voci corte.
        if any(isinstance(v, list) and (len(v) > 120 or any(isinstance(x, str) and len(x) > 20 for x in v)) for v in value.values()): raise ValueError('List too long')
        return value
