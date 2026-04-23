# Gestion de usuarios y autenticacion

Modulo reservado para separar la autenticacion del API principal.

Estructura prevista:

- `routes/`: endpoints HTTP de login, logout, usuario actual y administracion.
- `services/`: reglas de negocio de autenticacion, usuarios, roles y permisos.
- `security/`: hashing de passwords, tokens, sesiones y validaciones.
- `repositories/`: acceso a tablas de usuarios, roles, permisos y sesiones.
- `schemas/`: estructuras de entrada/salida para payloads del API.

