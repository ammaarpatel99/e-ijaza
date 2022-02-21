export enum SchemaNames {
  MASTER_CREDENTIALS = 'master_credentials',
  SUBJECTS = 'subjects',
  SUBJECT_DEFINITION = 'subject_definition',
  TEACHING_CREDENTIAL = 'teaching_credential'
}

export const masterCredentialNames: SchemaNames[] = [
  SchemaNames.MASTER_CREDENTIALS,
  SchemaNames.SUBJECTS,
  SchemaNames.SUBJECT_DEFINITION,
  SchemaNames.TEACHING_CREDENTIAL
]

export const userCredentialNames: SchemaNames[] = [
  SchemaNames.TEACHING_CREDENTIAL
]


type Did = string
type Subject = string


export interface MasterCredentials {
  credentials: [Did, Subject[]] []
}

export interface Subjects {
  subjects: Subject[]
}

export interface SubjectDefinition {
  subject: Subject
  children: Subject[]
  components: Subject[][]
}

export interface TeachingCredential {
  subject: Subject
}
