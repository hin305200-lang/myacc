export type PageAppearance = 'terminal' | 'banking'

export function getPageTheme(appearance: PageAppearance = 'terminal') {
  const bank = appearance === 'banking'
  return {
    page: bank
      ? 'pb-4'
      : 'h-full overflow-y-auto bg-[#0a0e27] p-3 sm:p-4 lg:p-6',
    card: bank
      ? 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80'
      : 'bg-[#161b3d] border border-[#1e293b] rounded-lg p-3 sm:p-4 lg:p-6',
    cardMuted: bank
      ? 'rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/80'
      : 'bg-[#161b3d]/60 border border-[#1e293b] rounded-lg p-3',
    title: bank ? 'text-slate-900' : 'text-[#94a3b8]',
    subtitle: bank ? 'text-slate-600' : 'text-white',
    heading: bank ? 'text-slate-900' : 'text-white',
    label: bank ? 'text-slate-500' : 'text-[#94a3b8]',
    body: bank ? 'text-slate-700' : 'text-white',
    input: bank
      ? 'w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]'
      : 'w-full px-4 py-2 border border-[#1e293b] rounded-lg bg-[#0d1230] text-white focus:outline-none focus:ring-2 focus:ring-[#6366f1]',
    btn: bank
      ? 'w-full py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition disabled:opacity-50'
      : 'w-full py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition disabled:opacity-50',
  }
}
