# Lusery Ecommerce Platform

## 🚀 Despliegue en Producción

### Prerrequisitos
- Cuenta en [Netlify](https://netlify.com)
- Cuenta en [Render](https://render.com)
- Cuenta en [Supabase](https://supabase.com)
- Repositorio en GitHub

---

## 📦 PASO 1: Desplegar Backend en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Name:** `lusery-backend`
   - **Region:** Oregon (u otra región)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

5. **Variables de Entorno en Render:**
```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:pass@host:5432/db
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   SESSION_SECRET=(autogenerado por Render)
```

6. Click **"Create Web Service"**
7. **Copia la URL que te da Render** (ej: `https://lusery-backend.onrender.com`)

---

## 🌐 PASO 2: Configurar Frontend en Netlify

1. Ve a tu sitio en [Netlify](https://app.netlify.com)
2. **Site settings** → **Environment variables**
3. Agrega esta variable:
```
   VITE_API_URL=https://lusery-backend.onrender.com
```
   ⚠️ **Importante:** Usa la URL exacta que copiaste de Render

4. **Deploys** → **Trigger deploy** → **Deploy site**

---

## 🔑 Obtener Credenciales de Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. **Settings** → **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🗄️ Obtener Database URL

1. En Supabase: **Settings** → **Database**
2. En **Connection string** → **URI**
3. Copia la URL que empieza con `postgresql://`
4. Reemplaza `[YOUR-PASSWORD]` con tu contraseña real

---

## ✅ Verificar que Funciona

1. Abre tu sitio de Netlify: `https://tu-sitio.netlify.app`
2. Ve a `/admin/login`
3. Si NO aparece error de conexión = ¡Funciona! ✅
4. Si aparece error → Revisa las variables de entorno

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to server"
- ✅ Verifica que `VITE_API_URL` en Netlify tenga la URL de Render
- ✅ Verifica que el backend en Render esté corriendo (verde)

### Error: "Database connection failed"
- ✅ Verifica `DATABASE_URL` en Render
- ✅ Asegúrate de que la contraseña sea correcta

### Error: "Supabase error"
- ✅ Verifica las 3 variables de Supabase en Render

---

## 📝 Variables de Entorno - Resumen

### En Netlify (Frontend):
```
VITE_API_URL=https://lusery-backend.onrender.com
```

### En Render (Backend):
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=(autogenerado)
```
