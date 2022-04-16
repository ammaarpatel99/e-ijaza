import {getHeldCredentials, isCredentialRevoked} from "../";

export async function getCredentialsBySchema(
  schemaID: string,
  secondaryFilter?: (cred: {[key: string]: string}) => boolean) {
  const promises = (await getHeldCredentials({})).results!
    .filter(cred => cred.schema_id === schemaID)
    .filter(cred => !secondaryFilter ? true : cred.attrs ? secondaryFilter(cred.attrs) : false)
    .map(async cred => ({
      isValid: !(await isCredentialRevoked({credential_id: cred.referent!}, {})).revoked,
      cred
    }));
  return (await Promise.all(promises))
    .filter(credData => credData.isValid)
    .map(credData => credData.cred)
}

export async function getCredentialBySchema(
  schemaID: string,
  secondaryFilter?: (cred: {[key: string]: string}) => boolean) {
  return (await getCredentialsBySchema(schemaID, secondaryFilter)).shift()
}
