// Formats message object
function formatMessage(user, text) {
  return {
    id: Math.random().toString(36).substring(2, 9),
    user: user.username,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

module.exports = { formatMessage };