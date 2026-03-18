# Taxora Codebase Assistance Guide

This document is written for an AI coding agent that will be dropped into the
`Taxora-main` workspace for the first time.  It highlights the things a human
reviewer would normally tell you in conversation.

---
## 1. Big‑picture architecture

* **Full‑stack monorepo**.  Two top‑level folders: `backend/` (Django Rest
  Framework) and `frontend/` (React + Vite + TypeScript).  The root contains
documentation and utility scripts only.
* **Backend apps** live under `backend/apps/` plus a standalone `chat/` app.  Each
  app follows the familiar pattern: `models.py`, `serializers.py`, `views.py`,
  `urls.py`, and a `migrations/` subdirectory.  Extra utilities (e.g. `tasks`,
  `ai_utils`) are in dedicated modules.
* **Custom user model** in `apps/users/models.py` (`AUTH_USER_MODEL`).  Fields
  include `role` (`'SME'` or `'CA'`), `business_name`, `gst_number`, etc.
* **API routing**: root URL config (`backend/taxora/urls.py`) includes
  `path('api/', include(...))`.  Authentication endpoints are under
  `/api/auth/`; other apps register their own prefixes.
* **Authentication** is JWT via `rest_framework_simplejwt`.  Headers must contain
  `Authorization: Bearer <accessToken>`; tokens are issued by
  `apps/users/views.login`/`register`.
* **Chat subsystem** is its own app with two models, `Conversation` (custom
  UUID primary key, status workflow) and `Message`.  Conversations are
  established by SMEs and accepted by CAs.  See `chat/views.py` for
  `ConversationViewSet` and related actions (`accept`, `reject`, `mark_as_read`).
  Table names are explicitly `conversations` and `messages` (not the default
  `chat_conversation`).
* **Frontend flow**: components talk to the backend only through service
  modules (`frontend/src/services/*.ts`).  `authService` handles login,
  registration, password reset, and CA listing; `chatService` mirrors the
  conversation/message endpoints, with polling for new messages.
* **Data passes** as plain JSON, except file uploads (multipart/form-data).
  Frontend uses `fetch` directly in `chatService` and an `axios` instance in
  `api.ts` for the rest; both respect `VITE_API_BASE_URL`.

---
## 2. Developer workflows

1. **Environment**
   * Backend: create a Python venv, `pip install -r backend/requirements.txt`.
   * Frontend: `npm install` inside `frontend/`.
   * Copy `.env.example` to `.env` in `backend/` and set credentials.  Only a
     few values are required locally (SECRET_KEY, DB settings, FRONTEND_URL).

2. **Database**
   * Default sqlite3 for local dev (`USE_SQLITE=true`).  PostgreSQL is
     supported via environment variables; migration commands are the same.
   * After changing models, run `python manage.py makemigrations <appname>`
     then `python manage.py migrate`.
   * There are two handy management commands used during development:
     `create_demo_cas` and `create_demo_clients` (look in
     `apps/users/management/`).  `python manage.py loaddata fixtures/initial_data.json`
     seeds roles, a few users, and sample settings.

3. **Running the servers**
   * Backend (from repo root):
     ```powershell
     cd backend
     python manage.py runserver 8000
     ```
   * Frontend:
     ```bash
     cd frontend
     npm run dev      # development
     npm run build    # production bundle
     ```
   * The frontend defaults to `http://localhost:5173`; the backend is
     `http://127.0.0.1:8000/`.

4. **Testing**
   * Most backend tests live under `backend/apps/*/tests.py`.  They are run
     with Django's test runner:
     ```bash
     cd backend
     python manage.py test apps.users.tests.UserAPITest
     ```
     or specify a single method as shown in existing examples.
   * When adding new API behaviour, add a unit test here.  Use
     `APIClient` and `force_authenticate` to simulate logged‑in users.  Remember
     to pass a `username` when creating `User` instances in tests.

5. **Debugging / exploration**
   * Use `python manage.py shell` to import models or call views directly.
     Example from earlier session:
     ```python
     from apps.users.views import list_cas
     from django.test import RequestFactory
     ...
     ```
   * SQLite can be inspected via `sqlite3 db.sqlite3` or by opening it in a
     GUI.  Table names for chat are `conversations` and `messages` (not the
     default names).

---
## 3. Project‑specific conventions

* **Naming**
  * Backend uses `snake_case` for Python, but serializers often use `camelCase`
    keys to match frontend expectations (`business_name` → `businessName` in
    JSON).
  * Frontend TypeScript types and variables use `camelCase`.
* **Responses**
  * Standard listing endpoints return `{results: [...], count: n}` for
    pagination.  `list_cas` follows this pattern even though it is unpaged.
* **Permissions**
  * `@permission_classes([permissions.IsAuthenticated])` is added to all
    views except those annotated with `AllowAny` (login/register/password reset).
  * Role checks are explicit in view logic (`if request.user.role != 'CA':`).
* **Error handling**
  * Backend returns `Response({'error': '...'}, status=...)` or `{'detail': '...'}`.
  * Frontend services throw `Error` objects with either `error.detail` or
    `error.error` from the backend.
* **Frontend UI components**
  * Shared UI bits live under `src/components/ui` (Radix‑based cards, buttons,
    etc.).  Pages/components import them to stay consistent.
  * The chat component (`Chat.tsx`) does its own polling loop and state
    management; don’t reimplement that in other parts.

---
## 4. Integration points & dependencies

* **External APIs**
  * AI features talk to Groq and HuggingFace tokens stored in `.env` but
    require extra packages; these subsystems can be ignored unless doing AI
    work.  If you modify `apps/ai_services`, check `ai_utils.py` and
    `groq_client.py` for wrappers.
* **Email**
  * Password reset uses Django's `email_user` with `FRONTEND_URL` to construct
    a link.  The development environment sends mail via console by default.
  * SMTP credentials are loaded via environment variables in `settings.py`.
* **Frontend configuration**
  * `VITE_API_BASE_URL` is used in `frontend/src/services/api.ts`.  The
    `authService` and `chatService` prepend that and include tokens from
    `localStorage`.
* **Client‑CA relationship**
  * `apps/users/models.py` contains `ClientRelationship`.  Backend endpoints
    for creating or listing clients often reference this model.  The CA
    connect screen in `frontend/src/components/CAConnect.tsx` depends on the
    `list_cas` endpoint shape.

---
## 5. Adding new functionality

When you add a new feature:

1. **Backend**
   * Create/modify models under the appropriate app and run migrations.
   * Add serializers in `serializers.py` and expose them in `views.py` or
     `viewsets`.  Reuse `api_view` for simple, single‑purpose endpoints.
   * Register the URL in the app’s `urls.py` and include it in `taxora/urls.py`.
   * Add permission and role logic as needed.
   * Write a test in `apps/<app>/tests.py` exercising the HTTP endpoint.

2. **Frontend**
   * Add a method to `authService` or `chatService` (or create a new service).
   * Add corresponding declaration to `frontend/src/services/api.ts`.
   * Update or create a component under `src/components`.  Leverage existing
     UI primitives and follow the pattern of `Chat.tsx` for stateful screens.
   * Add a route entry in `App.tsx` if the component is a new page.
   * If behaviour is shared (e.g. polling), reuse existing hooks or services.

3. **Manual validations**
   * Test the endpoint with `curl` or `python -c` snippet shown earlier.  Use
     Django shell to inspect DB rows.
   * Ensure CORS settings allow the frontend origin (check
     `settings.CORS_ALLOWED_ORIGINS`).

---
## 6. Helpful examples / snippets

* **Creating a conversation (SME → CA)**
  ```python
  from apps.users.models import User
  from chat.models import Conversation
  ca = User.objects.get(role='CA', email='ca@example.com')
  sme = User.objects.get(role='SME', email='user@example.com')
  Conversation.objects.create(ca=ca, sme=sme, status='pending')
  ```
* **Accepting a request via HTTP**
  ```bash
  curl -X PATCH \ 
    -H "Authorization: Bearer <token>" \
    http://127.0.0.1:8000/api/chat/conversations/<uuid>/accept/
  ```
* **Frontend polling loop** (use in Chat.tsx):
  ```ts
  useEffect(() => {
    const interval = setInterval(loadDetails, 2000);
    return () => clearInterval(interval);
  }, [selectedConversation]);
  ```

---
## 7. Keep in mind

* Much of the README is boilerplate; the actual implementation uses simple
  SQLite and no Celery/Redis in dev.  Check `settings.py` for ‘USE_SQLITE’
  and `INSTALLED_APPS` to see what’s really active.
* The Chat models’ `db_table` overrides mean SQL queries refer to
  `conversations`/`messages`, not the default `chat_conversation`.
* When modifying serializers or views, run the test suite.  Several build
  errors have stemmed from missing return statements (e.g. `list_cas`).

---

If anything in the previous sections is unclear or out‑of‑date, let me know so
I can adjust the instructions. Happy coding!  ✨