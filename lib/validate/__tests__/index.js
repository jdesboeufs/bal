/* eslint camelcase: off */

const {join} = require('path')
const fs = require('fs')
const {promisify} = require('util')
const test = require('ava')

const {validate} = require('..')

const readFile = promisify(fs.readFile)

function readAsBuffer(relativePath) {
  const absolutePath = join(__dirname, 'data', relativePath)
  return readFile(absolutePath)
}

test('validate a file', async t => {
  const buffer = await readAsBuffer('sample.csv')
  const report = await validate(buffer)
  t.is(report.encoding, 'utf-8')
})

test('validate a file with aliases', async t => {
  const buffer = await readAsBuffer('aliases.csv')
  const {fields, notFoundFields} = await validate(buffer)

  const aliasedFields = {
    cle_interop: 'cle_intero',
    commune_nom: 'commune_no',
    commune_insee: 'commune_in',
    date_der_maj: 'date_der_m',
    lat: 'lat_wgs84',
    long: 'long_wgs84',
    uid_adresse: 'uid_adress',
    x: 'x_l93',
    y: 'y_l93'
  }

  for (const schemaName of Object.keys(aliasedFields)) {
    const originalName = aliasedFields[schemaName]
    t.truthy(fields.find(f => f.name === originalName && f.schemaName === schemaName))
  }

  for (const field of [
    'cle_interop',
    'uid_adresse',
    'voie_nom',
    'numero',
    'suffixe',
    'commune_nom',
    'position',
    'x',
    'y',
    'long',
    'lat',
    'source',
    'date_der_maj'
  ]) {
    t.true(fields.some(f => f.schemaName === field))
  }

  t.true(notFoundFields.length === 4)

  for (const field of [
    'lieudit_complement_nom',
    'commune_deleguee_insee',
    'commune_deleguee_nom',
    'cad_parcelles'
  ]) {
    t.true(notFoundFields.some(f => f.schemaName === field))
  }

  // Unknown fields
  t.true(fields.filter(f => !f.schemaName).length === 0)
})

test('validate a file with aliases / strict mode', async t => {
  const buffer = await readAsBuffer('aliases.csv')
  const {fields, notFoundFields} = await validate(buffer, {strict: true})

  const unknownFields = fields.filter(f => !f.schemaName)
  const knownFields = fields.filter(f => f.schemaName)
  const aliasedFields = knownFields.filter(f => f.name !== f.schemaName)

  for (const field of [
    'voie_nom',
    'numero',
    'suffixe',
    'position',
    'source'
  ]) {
    t.truthy(knownFields.find(f => f.schemaName === field))
  }

  t.is(aliasedFields.length, 0)
  t.is(knownFields.length, 5)
  t.is(notFoundFields.length, 13)
  t.is(unknownFields.length, 9)
})

test('validate a binary file', async t => {
  const buffer = await readAsBuffer('troll.png')
  await t.throwsAsync(() => validate(buffer), {message: 'Unable to detect encoding'})
})

test('validate an arbitrary CSV file', async t => {
  const buffer = await readAsBuffer('junk.ascii.csv')
  const {notFoundFields} = await validate(buffer)
  t.is(notFoundFields.length, 18)
})
