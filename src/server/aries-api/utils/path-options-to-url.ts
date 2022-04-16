export function pathOptionsToUrl<Obj extends Parameters<typeof Object.entries>[0]>(pathOptions: Obj) {
  let url = ''
  for (const [key, value] of Object.entries(pathOptions)) {
    if (value === undefined) continue
    url += (url.length === 0) ? '?' : '&'
    url += `${key}=${value}`
  }
  return url
}
