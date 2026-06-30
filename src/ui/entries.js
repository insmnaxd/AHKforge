export function removeEntryByReference(entries, entry) {
  const currentIndex = entries.indexOf(entry);
  if (currentIndex === -1) return false;

  entries.splice(currentIndex, 1);
  return true;
}
