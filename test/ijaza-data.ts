import {TestData} from "./test-data-type";
import {ProposalType, SubjectProposalType} from "../src/types/schemas";

const users: TestData['users'] = [
  'The prophet',
  'Salamah bin Al-Akwa',
  'Yazid bin Abi Obaid',
  'Makki bin Ibrahim',
  'Muhammad ibn Ismail al-Bukhari Allah ibn Abi Muhammad Abd al-Farbari',
  'Muhammad ibn Yusuf ibn Matar',
  'Ahmad al-Sharkhasi',
  'Abu al-Hasan Abd al-Rahman bin Muhammad al-Dawdi',
  'Abi al-Waqat Abdul Awal bin Issa bin Shuaib al-Sijzi al-Harawi',
  'Fath al-Zai al-hanbali',
  'Siraj Al-Hussein bin Al-Mubarak Al-Zubaidi',
  'Abi Al-Abbas Ahmed bin Abi Talib Al-Hajjar',
  'Professor Ibrahim bin Ahmed Al-Tanukhi',
  'Sheikh of Shana Abi Al-Fadl bin',
  'Sheikh of Islam Qadi Zakaria',
  'Abu Al-Naga Salem bin Muhammad Al-Sanhouri',
  'Sheikh Ali Al-Ayoubi Al-Khatib',
  'Sheikh Issa bin Muhammed bin Muhammed bin Ahmed al-Jaafari',
  'Sheikh Muhammad'
]

const issueCreds: TestData['issueCreds'] = []
for (let i = 0; i < users.length - 1; i++) {
  issueCreds.push({issuer: users[i], receiver: users[i+1], subject: 'ijaza_subject'})
}

export const testData: TestData = {
  users,
  ontologyCommands: [
    {subject: 'knowledge', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.CHILD, child: 'ijaza_subject'}}
  ],
  master:{
    name: 'The prophet',
    subject: 'ijaza_subject'
  },
  issueCreds,
  test: {
    user: 'Sheikh Muhammad',
    subject: 'ijaza_subject'
  }
}
