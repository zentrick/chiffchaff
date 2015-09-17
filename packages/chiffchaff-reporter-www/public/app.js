(function (globals) {
  'use strict'

  var RELATIVE = true

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

  var walkData = function (data, $ul) {
    if (!data.length) {
      return
    }
    for (var i = 0; i < data.length; ++i) {
      var node = data[i]
      var $bar = createProgressBar(node, $li)
      var $li = $('<li>').append($bar)
      $ul.append($li)
      if (node.children) {
        var $childUl = $('<ul>').appendTo($li)
        walkData(node.children, $childUl)
      }
    }
  }

  var onData = function (data) {
    $container.empty()
    walkData(data, $container)
  }

  socket.on('init', function (data) {
    init()
    onData(data)
  })

  socket.on('data', onData)
})(this)
