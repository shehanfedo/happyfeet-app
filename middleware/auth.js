function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      message: 'Admins only. Your receptionist account cannot access this page.',
    });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
