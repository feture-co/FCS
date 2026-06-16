const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    mobile: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
    resetToken: DataTypes.STRING,
    resetExpires: DataTypes.DATE,
    lastLoginAt: DataTypes.DATE,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'users',
    hooks: {
      beforeSave: async user => {
        if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
      }
    }
  });

  User.prototype.comparePassword = function comparePassword(password) {
    return bcrypt.compare(password, this.password);
  };

  return User;
};
