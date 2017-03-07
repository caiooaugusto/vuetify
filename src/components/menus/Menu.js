import Toggleable from '../../mixins/toggleable'

export default {
  name: 'menu',

  mixins: [Toggleable],

  data () {
    return {
      window: {},
      dimensions: {
        activator: {
          top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, offsetTop: 0
        },
        content: {
          top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, offsetTop: 0
        },
        list: null,
        selected: null
      },
      direction: { vert: 'bottom', horiz: 'right' },
      position: { left: '0px', top: '0px', right: 'auto', bottom: 'auto' },
      isContentActive: false
    }
  },

  props: {
    top: Boolean,
    left: Boolean,
    bottom: Boolean,
    right: Boolean,
    auto: Boolean,
    offsetX: Boolean,
    offsetY: Boolean,
    nudgeXAuto: {
      type: Number,
      default: 0
    },
    nudgeYAuto: {
      type: Number,
      default: 0
    },
    openOnClick: {
      type: Boolean,
      default: true
    },
    closeOnClick: {
      type: Boolean,
      default: true
    },
    origin: {
      type: String,
      default: 'top left'
    }
  },

  computed: {
    offset () {
      const { activator: a, content: c } = this.dimensions
      const { direction, offsetX, offsetY, offsetAuto: auto } = this

      const horiz = direction.horiz === 'left'
          ? offsetX ? a.left - c.right : a.right - c.right + auto.horiz
          : offsetX ? a.right - c.left : a.left - c.left + auto.horiz
      const vert = direction.vert === 'top'
          ? offsetY ? a.top - c.bottom : a.bottom - c.bottom + auto.vert
          : offsetY ? a.bottom - c.top : a.top - c.top + auto.vert

      return { horiz, vert }
    },

    offsetAuto () {
      if (!this.auto) return { horiz: 0, vert: 0 }
      if (!this.dimensions.selected) return { horiz: this.nudgeXAuto, vert: this.nudgeYAuto }

      const { activator: a, content: c, selected: s, list } = this.dimensions
      const offsetBottom = list.height - s.height - s.offsetTop
      const scrollMiddle = (c.height - s.height) / 2
      const horiz = this.nudgeXAuto
      let vert = (a.height - c.height + this.nudgeYAuto) / 2

      vert += s.offsetTop < scrollMiddle ? scrollMiddle - s.offsetTop : 0
      vert += offsetBottom < scrollMiddle ? offsetBottom - scrollMiddle : 0

      return { horiz, vert }
    },

    screenDist () {
      const { activator: a } = this.dimensions
      const { innerHeight: innerH, innerWidth: innerW } = this.window
      const dist = {}

      dist.top = this.offsetY ? a.top : a.bottom
      dist.left = this.offsetX ? a.left : a.right
      dist.bottom = this.offsetY ? innerH - a.bottom : innerH - a.top
      dist.right = this.offsetX ? innerW - a.right : innerW - a.left
      dist.horizMax = dist.left > dist.right ? dist.left : dist.right
      dist.horizMaxDir = dist.left > dist.right ? 'left' : 'right'
      dist.vertMax = dist.top > dist.bottom ? dist.top : dist.bottom
      dist.vertMaxDir = dist.top > dist.bottom ? 'top' : 'bottom'

      return dist
    },

    screenOverflow () {
      const { content: c } = this.dimensions
      const left = c.left + this.offset.horiz
      const top = c.top + this.offset.vert

      const horiz = this.auto && left + c.width > this.window.innerWidth
          ? (left + c.width) - this.window.innerWidth
          : this.auto && left < 0
            ? left
            : 0
      const vert = this.auto && top + c.height > this.window.innerHeight
          ? (top + c.height) - this.window.innerHeight
          : this.auto && top < 0
            ? top
            : 0

      return { horiz, vert }
    },

    styles () {
      return {
        top: this.position.top,
        left: this.position.left,
        right: this.position.right,
        bottom: this.position.bottom
      }
    }
  },

  watch: {
    isActive (val) {
      if (val) this.activate()
      else this.isContentActive = false
    }
  },

  methods: {
    activate () {
      this.window = window

      this.setDirection()
      this.$nextTick(() => {
        this.updatePosition()
      })
    },

    setDirection (horiz = '', vert = '') {
      this.direction = {
        horiz: horiz || (this.left && !this.auto ? 'left' : 'right'),
        vert: vert || (this.top && !this.auto ? 'top' : 'bottom')
      }

      // On every direction change, we must reset/reorientate position.
      this.position.top = this.direction.vert === 'top' ? 'auto' : '0px'
      this.position.left = this.direction.vert === 'left' ? 'auto' : '0px'
      this.position.bottom = this.direction.vert === 'bottom' ? 'auto' : '0px'
      this.position.right = this.direction.vert === 'right' ? 'auto' : '0px'
    },

    updatePosition () {
      this.updateDimensions()

      const { horiz, vert } = this.direction
      const { offset, screenOverflow: screen } = this

      this.position.left = horiz === 'left' ? 'auto' : `${offset.horiz - screen.horiz}px`
      this.position.top = vert === 'top' ? 'auto' : `${offset.vert - screen.vert}px`
      this.position.right = horiz === 'right' ? 'auto' : `${-offset.horiz - screen.horiz}px`
      this.position.bottom = vert === 'bottom' ? 'auto' : `${-offset.vert - screen.vert}px`

      this.flipFix()
    },

    updateDimensions () {
      this.sneakPeek()
      this.updateMaxMin()

      const { activator: a, content: c } = this.$refs

      this.dimensions = {
        'activator': this.measure(a.children ? a.children[0] : a),
        'content': this.measure(c),
        'list': this.measure(c, '.list'),
        'selected': this.measure(c, '.list__tile--active', 'parent')
      }

      this.offscreenFix()
      this.updateScroll()
      this.sneakPeek(false)
    },

    updateMaxMin () {
      const { $refs, maxHeight } = this
      const a = $refs.activator.children ? $refs.activator.children[0] : $refs.activator
      const c = $refs.content

      c.style.minWidth = `${a.getBoundingClientRect().width}px`
      c.style.width = c.style.width || c.style.minWidth
      c.style.maxHeight = null  // <-- TODO: This is a temporary fix.
      c.style.maxHeight = isNaN(maxHeight) ? maxHeight : `${maxHeight}px`
    },

    offscreenFix () {
      const { $refs, screenDist } = this
      const { vert } = this.direction

      // If not auto, reduce height to the max vertical distance to a window edge.
      if (!this.auto && this.dimensions.content.height > screenDist[vert]) {
        $refs.content.style.maxHeight = `${screenDist.vertMax}px`
        this.dimensions.content.height = $refs.content.getBoundingClientRect().height
      }
    },

    updateScroll () {
      if (!this.auto || !this.dimensions.selected) return

      const { content: c, selected: s, list: l } = this.dimensions
      const scrollMiddle = (c.height - s.height) / 2
      const scrollMax = l.height - c.height
      let offsetTop = s.offsetTop - scrollMiddle

      offsetTop = this.screenOverflow.vert && offsetTop > scrollMax ? scrollMax : offsetTop
      offsetTop = this.screenOverflow.vert && offsetTop < 0 ? 0 : offsetTop
      offsetTop -= this.screenOverflow.vert

      this.$refs.content.scrollTop = offsetTop
    },

    flipFix () {
      const { auto, screenDist } = this
      const { content: c } = this.dimensions
      let { horiz, vert } = this.direction

      // Flip direction, if needed, to where there's more distance from the screen edge.
      horiz = !auto && c.width > screenDist[horiz] ? screenDist.horizMaxDir : horiz
      vert = !auto && c.height > screenDist[vert] ? screenDist.vertMaxDir : vert

      if (horiz === this.direction.horiz && vert === this.direction.vert) {
        // No more flipping needed, now start transition.
        // Todo: Maybe move this call to a better place.
        this.startTransition()
        return
      }

      this.setDirection(horiz, vert)
      this.$nextTick(() => { this.updatePosition(false) })
    },

    startTransition () {
      this.$refs.content.offsetHeight // <-- Force DOM to repaint first.
      this.isContentActive = true
    },

    // Render functions
    // ====================

    genActivator (h) {
      const data = {
        ref: 'activator',
        slot: 'activator',
        class: {
          'menu__activator': true
        },
        on: {
          click: () => {
            if (this.openOnClick) this.isActive = !this.isActive
          }
        }
      }

      return h('div', data, [this.$slots.activator || null])
    },

    genTransition (h) {
      const data = {
        props: {
          origin: this.origin
        }
      }

      return h('v-menu-transition', data, [this.genContent(h)])
    },

    genContent (h) {
      const data = {
        ref: 'content',
        style: this.styles,
        directives: [{
          name: 'show',
          value: this.isContentActive
        }],
        'class': { 'menu__content': true },
        on: {
          click: () => { if (this.closeOnClick) this.isActive = false }
        }
      }

      return h('div', data, [this.$slots.default])
    },

    // Utils
    // ====================

    measure (el, selector, getParent = false) {
      el = selector ? el.querySelector(selector) : el
      el = el && getParent ? el.parentElement : el

      if (!el) return null
      const { top, left, bottom, right, width, height } = el.getBoundingClientRect()
      return { top, left, bottom, right, width, height, offsetTop: el.offsetTop }
    },

    // Todo: Need to pass original display and opacity into this method.
    sneakPeek (on = true) {
      if (on) {
        this.$refs.content.style.display = 'inline-block'
      } else {
        this.$refs.content.style.display = 'none'
      }
    }
  },

  render (h) {
    const data = {
      'class': {
        'menu': true
      },
      directives: [
        {
          name: 'click-outside'
        }
      ],
      on: {
        'keyup': e => { if (e.keyCode === 27) this.isActive = false }
      }
    }

    return h('div', data, [this.genActivator(h), this.genTransition(h)])
  }
}