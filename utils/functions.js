/*!
 * Get an object value from a specific path
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Object}       obj  The object
 * @param  {String|Array} path The path
 * @param  {*}            def  A default value to return [optional]
 * @return {*}                 The value
 */
var get = function (obj, path, def) {
  /**
   * If the path is a string, convert it to an array
   * @param  {String|Array} path The path
   * @return {Array}             The path array
   */
  var stringToPath = function (path) {
    // If the path isn't a string, return it
    if (typeof path !== 'string') return path

    // Create new array
    var output = []

    // Split to an array with dot notation
    path.split('.').forEach(function (item) {
      // Split to an array with bracket notation
      item.split(/\[([^}]+)\]/g).forEach(function (key) {
        // Push to the new array
        if (key.length > 0) {
          output.push(key)
        }
      })
    })

    return output
  }

  // Get the path as an array
  path = stringToPath(path)

  // Cache the current object
  var current = obj

  // For each item in the path, dig into the object
  for (var i = 0; i < path.length; i++) {
    // If the item isn't found, return the default (or null)
    if (!current[path[i]]) return def

    // Otherwise, update the current  value
    current = current[path[i]]
  }

  return current
}
const functions = module.exports
functions.flatify = require('flatify-obj')

/*!
 * Replaces placeholders with real content
 * Requires get() - https://vanillajstoolkit.com/helpers/get/
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param {String} template The template string
 * @param {String} local    A local placeholder to use, if any
 */

functions.placeholders = (template, data) => {
  'use strict'

  // Check if the template is a string or a function
  template = typeof (template) === 'function' ? template() : template
  if (['string', 'number'].indexOf(typeof template) === -1) throw new 'PlaceholdersJS: please provide a valid template'()

  // If no data, return template as-is
  if (!data) return template

  // Replace our curly braces with data
  template = template.replace(/\{\{([^}]+)\}\}/g, function (match) {
  // Remove the wrapping curly braces
  match = match.slice(2, -2)

  // Get the value
  var val = get(data, match.trim())

  // Replace
  if (!val) return '{{' + match + '}}'
  return val
  })

  return template
}

functions.placeholders2 = (tplStr, valuesObj = {}) => {
  const delimiters = ['{{', '}}']
  // const regEx = new RegExp(`/${delimiters[0]}(.*?)${delimiters[1]}/g`)
  const regEx = new RegExp('/<<(.*?)>>/g')
  const placeholders = tplStr.match(regEx) || []
  const values = this.flatify(valuesObj, true)
  const returnStr = tplStr
  console.log('values', values)

  placeholders.forEach(find => {
      const key = find.substring(delimiters[0].length, find.length - delimiters[1].length)
      const replace = values[key]
      console.log('find/replace', find, replace)
      if (replace) {
        returnStr.replace(
          find,
          replace
        )
        console.log('retStr After', returnStr)
      }
    })

  console.log('final returnStr', returnStr)
  return returnStr
}
