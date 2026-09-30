(() => {
  const gate = document.querySelector('#authGate');
  const form = document.querySelector('#authForm');
  const submit = document.querySelector('#authSubmit');
  const message = document.querySelector('#authMessage');
  const configStatus = document.querySelector('#authConfig');
  const modeToggle = document.querySelector('#authModeToggle');
  const workspaceFields = document.querySelectorAll('.workspace-name-field');
  let client;
  let signupMode = false;

  function setMessage(text, kind = '') {
    message.textContent = text;
    message.dataset.kind = kind;
  }

  function setMode(signup) {
    signupMode = signup;
    document.querySelector('#authTitle').textContent = signup ? 'Create your workspace' : 'Welcome back';
    document.querySelector('#authDescription').textContent = signup ? 'Start a private Orbit workspace for your team.' : 'Sign in to your private workspace.';
    submit.textContent = signup ? 'Create account' : 'Sign in';
    modeToggle.textContent = signup ? 'I already have an account' : 'Create an account';
    document.querySelector('#authPassword').autocomplete = signupMode ? 'new-password' : 'current-password';
    workspaceFields.forEach((field) => { field.hidden = !signup; });
    document.querySelector('#resetPassword').hidden = signup;
    setMessage('');
  }

  function showApp(user) {
    window.orbitUser = user;
    window.dispatchEvent(new CustomEvent('orbit-authenticated', { detail: { userId: user.id } }));
    document.body.classList.add('authenticated');
    document.querySelector('#profileEmail').textContent = user.email || 'Account';
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';
    document.querySelector('#profileName').textContent = name;
    document.querySelector('#profileInitials').textContent = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
    document.querySelector('#topInitials').textContent = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
    document.querySelector('#workspaceLabel').textContent = user.user_metadata?.workspace_name || `${name}'s workspace`;
    gate.setAttribute('aria-hidden', 'true');
  }

  async function initialize() {
    try {
      const response = await fetch('/api/auth-config', { cache: 'no-store' });
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || 'Authentication is not configured.');
      if (!window.supabase?.createClient) throw new Error('Secure sign-in library did not load. Reload this page or check the network.');
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      });
      window.orbitAuth = client;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session?.user) showApp(data.session.user);
      else document.body.classList.remove('authenticated');
      configStatus.textContent = 'Protected by Supabase Auth';
      client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) showApp(session.user);
        else {
          document.body.classList.remove('authenticated');
          gate.removeAttribute('aria-hidden');
          setMode(false);
        }
      });
    } catch (error) {
      configStatus.textContent = error.message || 'Could not initialize secure sign-in.';
      configStatus.dataset.kind = 'error';
      submit.disabled = true;
      modeToggle.disabled = true;
      document.querySelector('#resetPassword').disabled = true;
    }
  }

  modeToggle.addEventListener('click', () => setMode(!signupMode));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) return;
    submit.disabled = true;
    setMessage(signupMode ? 'Creating your account…' : 'Signing in…');
    const email = document.querySelector('#authEmail').value.trim();
    const password = document.querySelector('#authPassword').value;
    try {
      const result = signupMode
        ? await client.auth.signUp({
            email, password,
            options: {
              data: { workspace_name: document.querySelector('#workspaceName').value.trim() || `${email.split('@')[0]}'s workspace` },
              emailRedirectTo: `${window.location.origin}/`,
            },
          })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (signupMode && !result.data.session) {
        setMessage('Check your email to confirm the account, then sign in.', 'success');
      } else if (result.data.user) {
        showApp(result.data.user);
        setMessage('');
      }
    } catch (error) {
      setMessage(error.message || 'Could not authenticate. Please try again.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector('#resetPassword').addEventListener('click', async () => {
    if (!client) return;
    const email = document.querySelector('#authEmail').value.trim();
    if (!email) return setMessage('Enter your email address first.', 'error');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
    setMessage(error ? error.message : 'If the account exists, a password reset link is on its way.', error ? 'error' : 'success');
  });

  document.querySelector('#signOut').addEventListener('click', async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) setMessage(error.message, 'error');
  });

  setMode(false);
  initialize();
})();
