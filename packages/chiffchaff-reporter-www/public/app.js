(function (globals) {
  'use strict'

  var RELATIVE = true
  var PLACEHOLDER_TEXT = 'Pending'

  var $ = globals.jQuery
  var io = globals.io

  var socket = io()
  var $container = $('<ul class="main">')

  var init = function () {
    $('.loading').remove()
    $container.appendTo(document.body)
  }

  var createProgressBar = function (node) {
    var progress, rate
    if (node.ended) {
      rate = 1
      progress = node.error || 'Completed'
    } else {
      rate = (node.total > 0) ? node.completed / node.total : 0
      progress = RELATIVE
        ? Number(rate * 100).toFixed(1) + '%'
        : Number(node.completed).toFixed(2) + '/' + Number(node.total).toFixed(2)
    }
    return $('<div class="bar-container">').addClass(node.error ? 'error' : 'ok')
      .append($('<div class="bar">').css('width', Math.round(rate * 100) + '%'))
      .append($('<div class="name">').text(node.name))
      .append($('<div class="progress">').text(progress))
  }

  var createPlaceholder = function () {
    return $('<div class="bar-container placeholder">')
      .append($('<div class="placeholder-text">').text(PLACEHOLDER_TEXT))
  }

  var walkData = function (data, size, $ul) {
    if (!data.length) {
      return
    }
    for (var i = 0; i < size; ++i) {
      var node = data[i]
      var $li = $('<li>')
      if (node) {
        createProgressBar(node).appendTo($li)
      } else {
        createPlaceholder().appendTo($li)
      }
      $ul.append($li)
      if (node && node.children) {
        var $childUl = $('<ul>').appendTo($li)
        var childrenSize = node.hasOwnProperty('size') ? node.size
          : node.children.length
        walkData(node.children, childrenSize, $childUl)
      }
    }
  }

  var onData = function (data) {
    $container.empty()
    walkData(data, data.length, $container)
  }

  socket.on('init', function (data) {
    console.info('Got init event, processing data:', data)
    init()
    onData(data)
  })

  socket.on('data', function (data) {
    console.info('Got data:', data)
    onData(data)
  })

  socket.on('end', function () {
    console.info('Got end event, disconnecting ...')
    socket.close()
  })
})(this)
