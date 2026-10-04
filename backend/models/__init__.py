"""Package del modello utente.

Questo file è volutamente minimale: in Python, un package può contenere un
`__init__.py` vuoto, che serve però a dichiarare il package all'interno del
progetto e a rendere importabili i modelli come `models.user_models`.

In questo progetto rappresenta il punto di ingresso logico del dominio degli
utenti, dove in futuro potranno essere aggiunti altri modelli (ad esempio
`Task`, `Subject`, `StudySession`, ecc.) senza cambiare la struttura del
package.
"""
