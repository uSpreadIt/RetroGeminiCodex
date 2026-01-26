const safeDecodeURIComponent = (value) => {
  if (!value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const encodeInvitePayload = (payload) => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
};

export const decodeInvitePayload = (encodedPayload) => {
  if (!encodedPayload) return null;
  try {
    const normalized = encodedPayload.replace(/ /g, '+');
    const decoded = safeDecodeURIComponent(normalized);
    const json = Buffer.from(decoded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const buildMinimalInvitePayload = (inviteData) => {
  if (!inviteData || typeof inviteData !== 'object') return null;

  const id = inviteData.id;
  const name = inviteData.name;
  const password = inviteData.password;
  if (!id || !name || !password) return null;

  const minimal = { id, name, password };

  if (inviteData.memberId) minimal.memberId = inviteData.memberId;
  if (inviteData.memberEmail) minimal.memberEmail = inviteData.memberEmail;
  if (inviteData.memberName) minimal.memberName = inviteData.memberName;
  if (inviteData.inviteToken) minimal.inviteToken = inviteData.inviteToken;

  const sessionId = inviteData.sessionId || inviteData.session?.id;
  if (sessionId) minimal.sessionId = sessionId;

  const healthCheckSessionId =
    inviteData.healthCheckSessionId || inviteData.healthCheckSession?.id;
  if (healthCheckSessionId) minimal.healthCheckSessionId = healthCheckSessionId;

  return minimal;
};

export const compactInviteLink = (link) => {
  try {
    const url = new URL(link);
    const joinParam = url.searchParams.get('join');
    if (!joinParam) return link;

    const inviteData = decodeInvitePayload(joinParam);
    const minimal = buildMinimalInvitePayload(inviteData);
    if (!minimal) return link;

    const encoded = encodeInvitePayload(minimal);
    url.searchParams.set('join', encoded);
    return url.toString();
  } catch {
    return link;
  }
};
