export const getCookie = (name: string) => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
}

export const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; max-age=31536000; path=/; SameSite=Lax`
}
