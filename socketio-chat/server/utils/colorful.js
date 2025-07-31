module.exports = {
  success: (text) => `\x1b[32m${text}\x1b[0m`,
  error: (text) => `\x1b[31m${text}\x1b[0m`,
  info: (text) => `\x1b[36m${text}\x1b[0m`,
  warn: (text) => `\x1b[33m${text}\x1b[0m`,
  debug: (text) => `\x1b[35m${text}\x1b[0m`,
  banner: (text) => `\x1b[46m\x1b[30m${text}\x1b[0m`
};