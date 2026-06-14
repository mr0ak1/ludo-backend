const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Popup extends Model {}

Popup.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Popup',
    tableName: 'popups',
    timestamps: true,
  }
);

module.exports = Popup;
