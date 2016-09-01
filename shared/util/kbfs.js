/* @flow */
import type {UserList} from '../common-adapters/usernames'

// Parses the folder name and returns an array of usernames
export function parseFolderNameToUsers (yourUsername: ?string, folderName: string): UserList {
  const [rwers, readers = ''] = folderName.split('#')
  return rwers.split(',')
    .map(u => ({
      username: u,
      you: yourUsername === u,
    }))
    .concat(
      readers
      .split(',')
      .map(u => ({
        username: u,
        you: yourUsername === u,
        readOnly: true,
      }))
    ).filter(u => !!u.username)
}

export function sortUserList (users: UserList): UserList {
  const youAsRwer = users.filter(u => u.you && !u.readOnly)
  const rwers = users.filter(u => !u.you && !u.readOnly)
  const youAsReader = users.filter(u => u.you && !!u.readOnly)
  const readers = users.filter(u => !u.you && !!u.readOnly)

  // Turn boolean into int for flow to be okay with this type
  const sortByUsername = (a, b) => +(a.username > b.username)
  return youAsRwer.concat(rwers.sort(sortByUsername), youAsReader, readers.sort(sortByUsername))
}

export function stripPublicTag (folderName: string): string {
  return folderName.replace('#public', '')
}

export function getTLF (isPublic: boolean, basedir: string): string {
  if (isPublic) {
    // Public filenames look like cjb#public/foo.txt
    return `/public/${stripPublicTag(basedir)}`
  } else {
    // Private filenames look like cjb/foo.txt
    return `/private/${basedir}`
  }
}
